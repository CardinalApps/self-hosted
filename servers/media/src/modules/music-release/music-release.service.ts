import * as fs from 'fs'
import * as path from 'path'
import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm'
import { Repository, DataSource, QueryRunner } from 'typeorm'

import { MusicRelease } from './music-release.entity'
import { MusicReleaseMetadata } from './music-release-metadata.entity'
import { MusicReleaseThumbnail } from './music-release-thumbnail.entity'

import { EventService } from '../event/event.service'

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
  async get(id: number | string, relations = {}): Promise<MusicRelease | null> {
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

      return musicRelease[0]
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
  async create(
    title: string,
    artist: MusicArtist,
    artists?: MusicArtist[],
    genres?: MusicGenre[],
    queryRunner?: QueryRunner,
  ): Promise<MusicRelease> {
    const initial = {
      title,
      sortTitle: sortableString(title),
      artist: artist,
      artists: artists,
      genres: genres,
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
  async query(getMusicReleasesDto: GetMusicReleasesDto): Promise<[MusicRelease[], number]> {
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
    } = getMusicReleasesDto
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

    qb
      .orderBy(`musicRelease.${orderBy}`, order)
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
