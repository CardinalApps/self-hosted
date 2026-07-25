import { Injectable } from '@nestjs/common'
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm'
import { Repository, DataSource, QueryRunner, ILike } from 'typeorm'

import { MusicArtist } from './music-artist.entity'
import { MusicArtistMetadata } from './music-artist-metadata.entity'

import { EventService } from '../event/event.service'

import { GetMusicArtistsDto } from './dtos/GetMusicArtists.dto'
import { sortableString, isNumeric } from '../../utils/string'
import { LibraryService } from '../library/library.service'
import { MusicTrackService } from '../music-track/music-track.service'
import { RatingService } from '../rating/rating.service'
import { RatingMediaType } from '../rating/rating.entity'
import { MusicTrack } from '../music-track/music-track.entity'
import { User } from '../user/user.entity'

/**
 * Which per-user figures to compute for the artist's tracks. Both are off by
 * default because an artist can carry hundreds of tracks and most callers only
 * need the discography.
 */
export type MusicArtistTrackComputations = {
  user?: User
  playCount?: boolean
  rating?: boolean
}

@Injectable()
export class MusicArtistService {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
    @InjectRepository(MusicArtist)
    private musicArtistRepository: Repository<MusicArtist>,
    @InjectRepository(MusicArtistMetadata)
    private musicArtistMetadataRepository: Repository<MusicArtistMetadata>,
    private readonly libraryService: LibraryService,
    private readonly eventService: EventService,
    private readonly musicTrackService: MusicTrackService,
    private readonly ratingService: RatingService,
  ) {}

  /**
   * Returns the total number of music artists.
   */
  async count(): Promise<number> {
    return this.musicArtistRepository.count()
  }

  /**
   * Gets a single music artist.
   */
  async get(
    id: number | string,
    relations = {},
    computations: MusicArtistTrackComputations = {},
  ): Promise<MusicArtist | null> {
    const where = isNumeric(id)
      ? { id: id as number }
      : { musicArtistId: id as string }

    const musicArtist = await this.musicArtistRepository.find({
      where,
      relations: {
        ...relations,
      },
    })

    if (!musicArtist.length) {
      return null
    }

    const artist = musicArtist[0]
    await this.computeTrackFigures(artist, computations)

    return artist
  }

  /**
   * Hydrates play counts and the current user's ratings onto every track hanging
   * off the artist. The artist's own track list and its releases' track lists
   * hold the same rows, so both are looked up in one pass and patched together.
   */
  private async computeTrackFigures(
    artist: MusicArtist,
    { user, playCount, rating }: MusicArtistTrackComputations,
  ): Promise<void> {
    const wantsRating = rating && !!user

    if (!playCount && !wantsRating) {
      return
    }

    const trackLists: MusicTrack[][] = [
      ...(artist.tracks ? [artist.tracks] : []),
      ...(artist.releases ?? []).filter((release) => !!release.tracks).map((release) => release.tracks),
    ]

    const allTracks = trackLists.flat()

    if (!allTracks.length) {
      return
    }

    const playCounts = playCount
      ? await this.musicTrackService.getPlayCounts([...new Set(allTracks.map((track) => track.id))])
      : null

    const ratings = wantsRating
      ? await this.ratingService.getRatingsForMedia(
        user,
        RatingMediaType.MUSIC_TRACK,
        [...new Set(allTracks.map((track) => track.musicTrackId))],
      )
      : null

    for (const tracks of trackLists) {
      for (let i = 0; i < tracks.length; i++) {
        tracks[i] = {
          ...tracks[i],
          ...(playCounts ? { playCount: playCounts.get(tracks[i].id) || 0 } : {}),
          ...(ratings ? { rating: ratings.get(tracks[i].musicTrackId) ?? null } : {}),
        } as MusicTrack
      }
    }
  }

  /**
   * Gets a single music artist by name.
   */
  async getByName(name: string, relations = {}): Promise<MusicArtist | null> {
    const artists = await this.musicArtistRepository.find({
      where: {
        name: ILike(name),
      },
      relations: {
        ...relations,
      },
    })

    if (!artists.length) {
      return null
    }

    return artists[0]
  }

  /**
   * Returns all artists according to the query.
   */
  async query(getMusicArtistsDto: GetMusicArtistsDto): Promise<[MusicArtist[], number]> {
    const {
      take,
      skip,
      order,
      orderBy,
      tracks,
      releases,
      metadata,
      libraries,
    } = getMusicArtistsDto

    const qb = this.musicArtistRepository.createQueryBuilder('musicArtist')

    if (metadata) qb.leftJoinAndSelect('musicArtist.metadata', 'metadata')
    if (releases) qb.leftJoinAndSelect('musicArtist.releases', 'releases')
    if (tracks) qb.leftJoinAndSelect('musicArtist.tracks', 'tracks')

    // When filtering by library, join files
    if (libraries && libraries.length) {
      const libraryEntities = await this.libraryService.getLibraries(libraries)
      if (!tracks) qb.leftJoin('musicArtist.tracks', 'tracks')
      qb.innerJoin('tracks.file', ...this.libraryService.createJoinArgs(libraryEntities))
    }

    qb
      .orderBy(`musicArtist.${orderBy}`, order)
      .take(take)
      .skip(skip)

    return qb.getManyAndCount()
  }

  /**
   * Creates a new music artist in the database.
   */
  async create(name, queryRunner?: QueryRunner): Promise<MusicArtist> {
    const initial = {
      name,
      sortName: sortableString(name),
    }

    if (queryRunner) {
      return await queryRunner.manager.save(MusicArtist, initial)
    } else {
      return await this.musicArtistRepository.save(initial)
    }
  }
}
