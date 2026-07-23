import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common'
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm'
import { Repository, DataSource, Brackets, In, MoreThan } from 'typeorm'

import { PlaybackQueue } from './playback-queue.entity'

import { EventService } from '../event/event.service'

import { LibraryService } from '../library/library.service'
import { MusicTrack } from '../music-track/music-track.entity'
import { MusicTrackService } from '../music-track/music-track.service'
import { MusicRelease } from '../music-release/music-release.entity'
import { Rating } from '../rating/rating.entity'
import { PlaybackQueueItem } from './playback-queue-item.entity'
import { PlaybackQueueEvents } from './events'
import { CreatePlaybackQueueDto } from './dtos/CreatePlaybackQueue'

const TRUE_SHUFFLE_INIT_BATCH = 200
const HOUSE_MIX_INIT_BATCH = 50
const ENCORE_INIT_BUFFER = 25

/*
  When a played item has fewer than REFILL_THRESHOLD items after it, the queue
  is topped up with the next REFILL_BATCH items.
*/
const REFILL_THRESHOLD = 10
const REFILL_BATCH = 25

// How many of the most recently queued tracks seed the next related batch
const RELATED_TAIL_SIZE = 5

// The widest net that the relatedness scoring will rank in one pass
const CANDIDATE_POOL_SIZE = 500

const SHARED_ARTIST_SCORE = 3
const SHARED_GENRE_SCORE = 2
const MAX_RATING_SCORE = 2.5
const PLAY_COUNT_SCORE = 0.3
const MAX_SCORED_PLAYS = 5

/**
 * The DynamicPlayback class generates the queue items in all Queues whose type
 * is `dynamic`, both when a queue is created and whenever it needs more items.
 */
@Injectable()
export class DynamicPlayback implements OnModuleInit {
  // Queues that are currently being extended, so overlapping triggers cannot double-fill
  private extendingQueueIds = new Set<number>()

  constructor(
    @InjectDataSource()
    private dataSource: DataSource,

    @InjectRepository(PlaybackQueue)
    private queueRepository: Repository<PlaybackQueue>,

    @InjectRepository(PlaybackQueueItem)
    private queueItemRepository: Repository<PlaybackQueueItem>,

    @InjectRepository(MusicTrack)
    private musicTrackRepository: Repository<MusicTrack>,

    @InjectRepository(MusicRelease)
    private musicReleaseRepository: Repository<MusicRelease>,

    @InjectRepository(Rating)
    private ratingRepository: Repository<Rating>,

    private readonly eventService: EventService,
    private readonly libraryService: LibraryService,
    private readonly musicTrackService: MusicTrackService,
  ) {}

  // Refills run entirely server side so that every client of a user stays in sync
  onModuleInit() {
    this.eventService.subscribePrivate(this, PlaybackQueueEvents.ITEM_PLAYED, this.onQueueItemPlayed.bind(this))
  }

  /**
   * Throws when a queue creation request needs a seed that is missing or unknown.
   */
  async validateSeed(createPlaybackQueueDto: CreatePlaybackQueueDto): Promise<void> {
    const { type, dynamicType, seedMediaType, seedMediaId } = createPlaybackQueueDto

    if (type !== 'dynamic' || (dynamicType !== 'house_mix' && dynamicType !== 'encore')) {
      return
    }

    if (!seedMediaType || !seedMediaId) {
      throw new BadRequestException(`The ${dynamicType} queue type requires a seed.`)
    }

    const release = await this.musicReleaseRepository.findOne({
      where: {
        musicReleaseId: seedMediaId,
      },
    })

    if (!release) {
      throw new NotFoundException('The seed release does not exist.')
    }
  }

  /**
   * After a dynamic queue is created in the database, run it through here to
   * initialize the queue items.
   */
  async initDynamicQueue(queue: PlaybackQueue): Promise<boolean> {
    switch (queue.dynamicType) {
      case 'true_shuffle':
        return await this.initTrueShuffleQueue(queue)
      case 'house_mix':
        return await this.initHouseMixQueue(queue)
      case 'encore':
        return await this.initEncoreQueue(queue)
      default:
        Logger.error('Missing queue.dynamicType', 'DynamicPlayback')
        return false
    }
  }

  /**
   * Appends the next batch of items to a dynamic queue. Each dynamic type
   * decides for itself what its next tracks are. Clients are notified over SSE
   * so that every device of the user sees the same queue.
   */
  async extendQueue(queueId: string, batchSize = REFILL_BATCH): Promise<PlaybackQueueItem[]> {
    const queue = await this.queueRepository.findOne({
      where: {
        queueId,
      },
      relations: {
        user: true,
        libraries: true,
      },
    })

    if (!queue || queue.type !== 'dynamic') {
      return []
    }

    if (this.extendingQueueIds.has(queue.id)) {
      return []
    }

    this.extendingQueueIds.add(queue.id)

    try {
      const existingItems = await this.queueItemRepository.find({
        where: {
          queue: {
            id: queue.id,
          },
        },
        order: {
          position: 'asc',
        },
      })
      const queuedTrackIds = existingItems.map((item) => item.mediaId)

      let nextTrackIds: string[] = []

      switch (queue.dynamicType) {
        case 'true_shuffle':
          nextTrackIds = await this.nextTrueShuffleTracks(queue, queuedTrackIds, batchSize)
          break
        case 'house_mix':
        case 'encore':
          nextTrackIds = await this.nextRelatedTracks(queue, existingItems, batchSize)
          break
        default:
          Logger.error('Missing queue.dynamicType', 'DynamicPlayback')
          return []
      }

      if (!nextTrackIds.length) {
        return []
      }

      const created = await this.appendQueueItems(queue, nextTrackIds)

      this.eventService.emitToUser(queue.user?.userId, PlaybackQueueEvents.EXTENDED, {
        queueId: queue.queueId,
        addedCount: created.length,
      })

      return created
    } catch (error) {
      Logger.error(error)
      return []
    } finally {
      this.extendingQueueIds.delete(queue.id)
    }
  }

  /**
   * Initialize a True Shuffle queue.
   *
   * True Shuffle creates a queue with 200 random songs from the given
   * libraries. Randomization is applied by the database.
   */
  private async initTrueShuffleQueue(queue: PlaybackQueue): Promise<boolean> {
    const randomTrackIds = await this.randomTracks(queue, TRUE_SHUFFLE_INIT_BATCH, [])

    try {
      await this.appendQueueItems(queue, randomTrackIds)
      return true
    } catch (err) {
      Logger.error(err)
      return false
    }
  }

  /**
   * Initialize a House Mix queue.
   *
   * The mix always kicks off with a track from the seed release, then blends
   * tracks from nearby artists, genres, and albums, like a radio station that
   * was tuned to the release.
   */
  private async initHouseMixQueue(queue: PlaybackQueue): Promise<boolean> {
    const releaseTracks = await this.getSeedReleaseTracks(queue)

    if (!releaseTracks.length) {
      Logger.warn('A house_mix queue was created for a release with no tracks', 'DynamicPlayback')
      return false
    }

    const kickoff = releaseTracks[Math.floor(Math.random() * releaseTracks.length)]
    const mix = await this.generateRelatedBatch(queue, releaseTracks, HOUSE_MIX_INIT_BATCH - 1, [kickoff.musicTrackId])

    try {
      await this.appendQueueItems(queue, [kickoff.musicTrackId, ...mix])
      return true
    } catch (err) {
      Logger.error(err)
      return false
    }
  }

  /**
   * Initialize an Encore queue.
   *
   * The whole seed release plays front to back, and a buffer of related tracks
   * is queued up behind it for when the album ends.
   */
  private async initEncoreQueue(queue: PlaybackQueue): Promise<boolean> {
    const releaseTracks = await this.getSeedReleaseTracks(queue)

    if (!releaseTracks.length) {
      Logger.warn('An encore queue was created for a release with no tracks', 'DynamicPlayback')
      return false
    }

    const releaseTrackIds = releaseTracks.map((track) => track.musicTrackId)
    const encore = await this.generateRelatedBatch(queue, releaseTracks, ENCORE_INIT_BUFFER, releaseTrackIds)

    try {
      await this.appendQueueItems(queue, [...releaseTrackIds, ...encore])
      return true
    } catch (err) {
      Logger.error(err)
      return false
    }
  }

  /**
   * The next batch for a True Shuffle queue: more random tracks, avoiding
   * repeats until the library runs out of unheard material.
   */
  private async nextTrueShuffleTracks(queue: PlaybackQueue, queuedTrackIds: string[], batchSize: number): Promise<string[]> {
    const fresh = await this.randomTracks(queue, batchSize, queuedTrackIds)

    if (fresh.length >= batchSize) {
      return fresh
    }

    const repeats = await this.randomTracks(queue, batchSize - fresh.length, [])
    return [...fresh, ...repeats]
  }

  /**
   * The next batch for the seeded queue types: tracks related to the most
   * recently queued ones, so the queue drifts naturally instead of looping
   * around its seed forever.
   */
  private async nextRelatedTracks(queue: PlaybackQueue, existingItems: PlaybackQueueItem[], batchSize: number): Promise<string[]> {
    const tailTrackIds = existingItems.slice(-RELATED_TAIL_SIZE).map((item) => item.mediaId)

    let seedTracks = await this.musicTrackRepository.find({
      where: {
        musicTrackId: In(tailTrackIds),
      },
    })

    // A queue tail of untracked media can't seed anything; fall back to the original seed
    if (!seedTracks.length) {
      seedTracks = await this.getSeedReleaseTracks(queue)
    }

    return await this.generateRelatedBatch(queue, seedTracks, batchSize, existingItems.map((item) => item.mediaId), true)
  }

  /**
   * Produces a batch of related tracks, topped up with random tracks when the
   * library doesn't have enough related material. Repeats are a last resort for
   * refills, where the alternative is playback running dry — a freshly created
   * queue simply starts smaller instead.
   */
  private async generateRelatedBatch(
    queue: PlaybackQueue,
    seedTracks: MusicTrack[],
    count: number,
    excludeTrackIds: string[],
    allowRepeats = false,
  ): Promise<string[]> {
    if (count <= 0) {
      return []
    }

    const batch = await this.moreTracksLike(queue, seedTracks, count, excludeTrackIds)

    if (batch.length < count) {
      const fresh = await this.randomTracks(queue, count - batch.length, [...excludeTrackIds, ...batch])
      batch.push(...fresh)
    }

    if (allowRepeats && batch.length < count) {
      const repeats = await this.randomTracks(queue, count - batch.length, [])
      batch.push(...repeats)
    }

    return batch
  }

  /**
   * The relatedness engine. Returns up to `count` tracks that fit in with the
   * seed tracks, best fits first.
   *
   * A candidate shares an artist or a genre with the seeds, and is scored by
   * that proximity plus how much the user has favorited and listened to it,
   * with some jitter so that two identical queues don't play out identically.
   */
  private async moreTracksLike(
    queue: PlaybackQueue,
    seedTracks: MusicTrack[],
    count: number,
    excludeTrackIds: string[],
  ): Promise<string[]> {
    if (count <= 0 || !seedTracks.length) {
      return []
    }

    const seeds = await this.musicTrackRepository.find({
      where: {
        id: In(seedTracks.map((track) => track.id)),
      },
      relations: {
        artists: true,
        release: {
          genres: true,
        },
      },
    })

    const seedArtistIds = [...new Set(seeds.flatMap((track) => track.artists?.map((artist) => artist.id) || []))]
    const seedGenreIds = [...new Set(seeds.flatMap((track) => track.release?.genres?.map((genre) => genre.id) || []))]

    if (!seedArtistIds.length && !seedGenreIds.length) {
      return []
    }

    const candidatesQuery = this.musicTrackRepository
      .createQueryBuilder('track')
      .leftJoinAndSelect('track.artists', 'artist')
      .leftJoinAndSelect('track.release', 'release')
      .leftJoinAndSelect('release.genres', 'genre')
      .where(new Brackets((related) => {
        if (seedArtistIds.length) {
          related.orWhere('artist.id IN (:...seedArtistIds)', { seedArtistIds })
        }
        if (seedGenreIds.length) {
          related.orWhere('genre.id IN (:...seedGenreIds)', { seedGenreIds })
        }
      }))
      .take(CANDIDATE_POOL_SIZE)

    if (excludeTrackIds.length) {
      candidatesQuery.andWhere('track.musicTrackId NOT IN (:...excludeTrackIds)', { excludeTrackIds })
    }

    if (queue?.libraries?.length) {
      candidatesQuery.innerJoin('track.file', ...this.libraryService.createJoinArgs(queue.libraries))
    }

    const candidates = await candidatesQuery.getMany()

    if (!candidates.length) {
      return []
    }

    const ratings = queue.user
      ? await this.ratingRepository.find({
          where: {
            mediaType: 'music_track',
            mediaId: In(candidates.map((track) => track.musicTrackId)),
            user: {
              id: queue.user.id,
            },
          },
        })
      : []
    const ratingByTrackId = new Map(ratings.map((rating) => [rating.mediaId, rating.rating]))
    const playCounts = await this.musicTrackService.getPlayCounts(candidates.map((track) => track.id))

    const scored = candidates.map((track) => {
      const sharedArtist = track.artists?.some((artist) => seedArtistIds.includes(artist.id))
      const sharedGenre = track.release?.genres?.some((genre) => seedGenreIds.includes(genre.id))
      const rating = ratingByTrackId.get(track.musicTrackId) || 0
      const plays = playCounts.get(track.id) || 0

      const score = (sharedArtist ? SHARED_ARTIST_SCORE : 0)
        + (sharedGenre ? SHARED_GENRE_SCORE : 0)
        + Math.min(rating / 2, MAX_RATING_SCORE)
        + Math.min(plays, MAX_SCORED_PLAYS) * PLAY_COUNT_SCORE
        + Math.random()

      return { track, score }
    })

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, count)
      .map((scoredTrack) => scoredTrack.track.musicTrackId)
  }

  /**
   * Returns up to `count` random track ids, restricted to the queue's libraries.
   */
  private async randomTracks(queue: PlaybackQueue, count: number, excludeTrackIds: string[]): Promise<string[]> {
    if (count <= 0) {
      return []
    }

    const randomTracksQuery = this.musicTrackRepository
      .createQueryBuilder('music_track')
      .select(['music_track.musicTrackId'])
      .orderBy('RANDOM()')
      .limit(count)

    if (excludeTrackIds.length) {
      randomTracksQuery.where('music_track.musicTrackId NOT IN (:...excludeTrackIds)', { excludeTrackIds })
    }

    if (queue?.libraries?.length) {
      randomTracksQuery.innerJoin(
        'music_track.file',
        ...this.libraryService.createJoinArgs(queue.libraries),
      )
    }

    const tracks = await randomTracksQuery.getMany()
    return tracks.map((track) => track.musicTrackId)
  }

  /**
   * Returns the seed release's tracks in album order.
   */
  private async getSeedReleaseTracks(queue: PlaybackQueue): Promise<MusicTrack[]> {
    if (queue.seedMediaType !== 'music_release' || !queue.seedMediaId) {
      return []
    }

    return await this.musicTrackRepository.find({
      where: {
        release: {
          musicReleaseId: queue.seedMediaId,
        },
      },
      order: {
        discNumber: 'asc',
        trackNumber: 'asc',
      },
    })
  }

  /**
   * Inserts tracks at the end of a queue, in the given order.
   */
  private async appendQueueItems(queue: PlaybackQueue, trackIds: string[]): Promise<PlaybackQueueItem[]> {
    if (!trackIds.length) {
      return []
    }

    const lastItem = await this.queueItemRepository.findOne({
      where: {
        queue: {
          id: queue.id,
        },
      },
      order: {
        position: 'desc',
      },
    })

    let position = lastItem?.position || 0
    const items = trackIds.map((mediaId) => ({
      queue,
      mediaType: 'music_track' as const,
      mediaId,
      position: ++position,
    }))

    await this.queueItemRepository.insert(items)

    return items as PlaybackQueueItem[]
  }

  /**
   * A history entry was written for a queue item. When the item sits near the
   * end of a dynamic queue, the queue generates its next batch.
   */
  private async onQueueItemPlayed(payload: { queueItemId?: string }): Promise<void> {
    try {
      if (!payload?.queueItemId) {
        return
      }

      const playedItem = await this.queueItemRepository.findOne({
        where: {
          queueItemId: payload.queueItemId,
        },
        relations: {
          queue: true,
        },
      })

      if (!playedItem || playedItem.queue?.type !== 'dynamic') {
        return
      }

      const remaining = await this.queueItemRepository.count({
        where: {
          queue: {
            id: playedItem.queue.id,
          },
          position: MoreThan(playedItem.position),
        },
      })

      if (remaining >= REFILL_THRESHOLD) {
        return
      }

      await this.extendQueue(playedItem.queue.queueId)
    } catch (error) {
      Logger.error(error)
    }
  }
}
