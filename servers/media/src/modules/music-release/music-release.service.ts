import * as fs from 'fs'
import * as path from 'path'
import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm'
import { Repository, DataSource, QueryRunner } from 'typeorm'

import { MusicRelease } from './music-release.entity'
import { MusicReleaseMetadata } from './music-release-metadata.entity'
import { MusicReleaseThumbnail } from './music-release-thumbnail.entity'
import { ReleaseType } from './enums'

import { EventService } from '../event/event.service'
import { MusicTrack } from '../music-track/music-track.entity'
import { MusicTrackService } from '../music-track/music-track.service'
import { FAVORITE_THRESHOLD, RatingService } from '../rating/rating.service'
import { Rating, RatingMediaType } from '../rating/rating.entity'
import { User } from '../user/user.entity'

import { GetMusicReleasesDto } from './dtos/GetMusicReleases.dto'
import { MusicArtist } from '../music-artist/music-artist.entity'
import { MusicGenre } from '../music-genres/music-genre.entity'
import { isNumeric, sortableString } from '../../utils/string'

import { ALBUM_ART_FILE_NAME, ALBUM_ART_FILE_EXTENSION } from './types'
import { LibraryService } from '../library/library.service'

@Injectable()
export class MusicReleaseService {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,

    @InjectRepository(MusicRelease)
    private musicReleaseRepository: Repository<MusicRelease>,

    @InjectRepository(MusicReleaseMetadata)
    private musicReleaseMetadataRepository: Repository<MusicReleaseMetadata>,

    @InjectRepository(MusicReleaseThumbnail)
    private musicReleaseThumbnailRepository: Repository<MusicReleaseThumbnail>,

    @InjectRepository(MusicArtist)
    private musicArtistRepository: Repository<MusicArtist>,

    private readonly eventService: EventService,
    private readonly libraryService: LibraryService,
    private readonly musicTrackService: MusicTrackService,
    private readonly ratingService: RatingService,
  ) {}

  /**
   * Returns the total number of music releases.
   */
  async count(): Promise<number> {
    return this.musicReleaseRepository.count()
  }

  /**
   * Gets a single music release.
   */
  async get(id: number | string, relations = {}, user?: User): Promise<MusicRelease | null> {
    const where = isNumeric(id)
      ? { id: id as number }
      : { musicReleaseId: id as string }

    try {
      const musicRelease = await this.musicReleaseRepository.find({
        where,
        relations: {
          ...relations,
        },
      })

      if (!musicRelease.length) {
        return null
      }

      const release = musicRelease[0]

      if (release.tracks?.length) {
        const playCounts = await this.musicTrackService.getPlayCounts(release.tracks.map((track) => track.id))
        const ratings = user
          ? await this.ratingService.getRatingsForMedia(user, RatingMediaType.MUSIC_TRACK, release.tracks.map((track) => track.musicTrackId))
          : null

        release.tracks = release.tracks.map((track) => ({
          ...track,
          playCount: playCounts.get(track.id) || 0,
          ...(ratings ? { rating: ratings.get(track.musicTrackId) ?? null } : {}),
        }))
      }

      return release
    } catch (error) {
      Logger.error(error)
      return null
    }
  }

  /**
   * Gets a single music release by name and artist name. Artist name is
   * required for namespacing because two different artists can have releases
   * with the same name.
   */
  async getByName(title, artistName): Promise<MusicRelease | null> {
    const musicRelease = await this.musicReleaseRepository.find({
      where: {
        title: title,
        artists: {
          name: artistName,
        },
      },
    })

    if (!musicRelease.length) {
      return null
    }

    return musicRelease[0]
  }

  /**
   * Creates a new music release in the database.
   */
  async updateReleaseType(id: number, releaseType: ReleaseType, queryRunner?: QueryRunner): Promise<void> {
    if (queryRunner) {
      await queryRunner.manager.update(MusicRelease, id, { releaseType })
    } else {
      await this.musicReleaseRepository.update(id, { releaseType })
    }
  }

  async create(
    title: string,
    artist: MusicArtist,
    artists?: MusicArtist[],
    genres?: MusicGenre[],
    releaseType?: ReleaseType,
    queryRunner?: QueryRunner,
  ): Promise<MusicRelease> {
    const initial = {
      title,
      sortTitle: sortableString(title),
      artist: artist,
      artists: artists,
      genres: genres,
      releaseType: releaseType,
    } as Partial<MusicRelease>

    if (queryRunner) {
      return await queryRunner.manager.save(MusicRelease, initial)
    } else {
      return await this.musicReleaseRepository.save(initial)
    }
  }

  /**
   * Returns music releases.
   */
  async query(getMusicReleasesDto: GetMusicReleasesDto, user?: User): Promise<[MusicRelease[], number]> {
    const {
      take,
      skip,
      order,
      orderBy,
      artists,
      genres,
      tracks,
      thumbnails,
      metadata,
      libraries,
      favorites,
    } = getMusicReleasesDto

    // Ordering by a computed figure requires computing it, and favorites are per-user
    const withFavorites = favorites || orderBy === 'favoritedAt'
    if (withFavorites && !user) {
      return [[], 0]
    }

    const qb = this.musicReleaseRepository.createQueryBuilder('musicRelease')

    if (artists) qb.leftJoinAndSelect('musicRelease.artist', 'artist')
    if (artists) qb.leftJoinAndSelect('musicRelease.artists', 'artists')
    if (genres) qb.leftJoinAndSelect('musicRelease.genres', 'genres')
    if (tracks) qb.leftJoinAndSelect('musicRelease.tracks', 'tracks')
    if (thumbnails) qb.leftJoinAndSelect('musicRelease.thumbnails', 'thumbnails')
    if (metadata) qb.leftJoinAndSelect('musicRelease.metadata', 'metadata')

    // When filtering by library, join tracks and files
    if (libraries && libraries.length) {
      const libraryEntities = await this.libraryService.getLibraries(libraries)
      if (!tracks) qb.leftJoin('musicRelease.tracks', 'tracks')
      qb.innerJoin('tracks.file', ...this.libraryService.createJoinArgs(libraryEntities))
    }

    /*
      One aggregated row per release that contains favorites, so the join cannot
      duplicate releases. favorited_at is the release's most recent favorite.
    */
    if (withFavorites) {
      qb.innerJoin(
        (subQuery) => subQuery
          .select('favoritedTrack.release_id', 'release_id')
          .addSelect('MAX(favorite.created_at)', 'favorited_at')
          .from(Rating, 'favorite')
          .innerJoin(MusicTrack, 'favoritedTrack', 'favoritedTrack.music_track_id = favorite.media_id')
          .where('favorite.media_type = :favoriteMediaType')
          .andWhere('favorite.user_id = :favoriteUserId')
          .andWhere('favorite.rating = :favoriteThreshold')
          .groupBy('favoritedTrack.release_id'),
        'release_favorites',
        'release_favorites.release_id = musicRelease.id',
      )
      qb.addSelect('release_favorites.favorited_at', 'music_release_favorited_at')
      qb.setParameters({
        favoriteMediaType: RatingMediaType.MUSIC_TRACK,
        favoriteUserId: user.id,
        favoriteThreshold: FAVORITE_THRESHOLD,
      })
    }

    if (orderBy === 'favoritedAt') {
      qb.orderBy('music_release_favorited_at', order)
    } else {
      qb.orderBy(`musicRelease.${orderBy}`, order)
    }

    qb
      .take(take)
      .skip(skip)

    return await qb.getManyAndCount()
  }

  /**
   * Creates new artwork thumbnail entities in the database.
   */
  async createReleaseThumbnails(thumbnails: Partial<MusicReleaseThumbnail>[], queryRunner?: QueryRunner): Promise<MusicReleaseThumbnail[]> {
    if (queryRunner) {
      return await queryRunner.manager.save(MusicReleaseThumbnail, thumbnails)
    } else {
      return await this.musicReleaseThumbnailRepository.save(thumbnails)
    }
  }

  /**
   * Looks for album artwork in the file system and returns all matches.
   * 
   * @param release - MusicRelease or file system path to the release.
   */
  async getFileSystemArtwork(release: MusicRelease | string): Promise<string[]> {
    let releasePath

    if (typeof release === 'string') {
      releasePath = release
    } else if (release?.tracks?.[0]?.file?.absolutePath) {
      releasePath = release.tracks[0].file.absolutePath
    } else if (release?.id) {
      const found = await this.musicReleaseRepository.findOne({
        where: {
          id: release.id,
        },
        relations: {
          tracks: {
            file: true,
          },
        },
      })
      if (found) {
        releasePath = found?.tracks?.[0]?.file?.absolutePath
      }
    }

    if (!releasePath) {
      Logger.warn(`Invalid file system path for release: ${release}`)
      return []
    }

    const artOnFs = []

    for (const fileName of ALBUM_ART_FILE_NAME) {
      for (const fileExtension of ALBUM_ART_FILE_EXTENSION) {
        await new Promise<void>((resolve) => {
          const potentialPath = `/${path.join(releasePath, fileName)}.${fileExtension}`
          fs.access(potentialPath, fs.constants.R_OK, (err) => {
            if (!err) {
              artOnFs.push(potentialPath)
            }
            resolve()
          })
        })
      }
    }

    return artOnFs
  }
}
