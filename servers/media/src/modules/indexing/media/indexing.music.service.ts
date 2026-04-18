import * as path from 'path'
import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm'
import { Repository, DataSource, QueryRunner } from 'typeorm'

import { File } from '../entities/file.entity'
import { MusicTrack } from '../../music-track/music-track.entity'
import { MusicTrackMetadata } from '../../music-track/music-track-metadata.entity'
import { MusicTrackService } from '../../music-track/music-track.service'
import { EventService } from '../../event/event.service'
import { MusicArtist } from '../../music-artist/music-artist.entity'
import { MusicArtistService } from '../../music-artist/music-artist.service'
import { MusicRelease } from '../../music-release/music-release.entity'
import { MusicReleaseService } from '../../music-release/music-release.service'
import { MusicGenre } from '../../music-genres/music-genre.entity'
import { MusicGenreService } from '../../music-genres/music-genre.service'
import { IndexingEvents } from '../events'

import {
  MusicFileSystemStructureMetadata,
} from '../types'
import { IndexingFallbacks } from '../enums'
import { ReleaseType } from '../../music-release/enums'

import { sortableString } from '../../../utils/string'
import {
  getMetadataType,
  serializeMetadataValue,
  getTrustedValuesFromFileStats,
  readEmbeddedMusicMetadata,
} from '../../../utils/file'
import { envVar } from '../../../utils/env'

/**
 * Handles everything needed to index a music track.
 */
@Injectable()
export class MusicIndexingService {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
    @InjectRepository(MusicTrack)
    private musicTrackRepository: Repository<MusicTrack>,
    @InjectRepository(MusicArtist)
    private musicArtistRepository: Repository<MusicArtist>,
    @InjectRepository(MusicRelease)
    private musicReleaseRepository: Repository<MusicRelease>,
    @InjectRepository(MusicTrackMetadata)
    private musicTrackMetadataRepository: Repository<MusicTrackMetadata>,
    @InjectRepository(File)
    private fileRepository: Repository<File>,
    private readonly musicTrackService: MusicTrackService,
    private readonly musicReleaseService: MusicReleaseService,
    private readonly musicArtistService: MusicArtistService,
    private readonly musicGenreService: MusicGenreService,
    //private readonly thumbnailService: ThumbnailService,
    private readonly eventService: EventService,
  ) {}

  /**
   * Search the start of the string for a release year.
   * 
   * Examples:
   * 
   *   [2018] Album name
   *   (2018) Album name
   *   2018 Album name
   *   2018-Album name
   *   01 Track name
   *   [20] Track name
   *   (20) Track name
   *   (20)-Track name
   *   20 - Track name
   *   20 -Track name
   */
  private matchNumberPrefix = /^(\[?|\(?)\d+(\]?|\)?)\s?( |-)\s?/i

  /**
   * Search the start of the string for a track and optional disc number.
   * 
   * Examples:
   * 
   *   9 Psychopomp.mp3
   *   (09)-Psychopomp.mp3
   *   1-04 - The Great Debate.flac
   */
  private matchTrackAndDiscPrefix = /^[[|()]?([0-9]+)[-_]?([0-9]*)/

  /**
   * Updates the entities for a music track that was previously indexed.
   *
   * Preserves the existing MusicTrack ID (and therefore all MusicHistory rows
   * attached to it). Replaces all MusicTrackMetadata rows, then updates the
   * scalar columns on the existing track.
   */
  async updateMusicTrackEntities(file: File, existingTrack: MusicTrack, queryRunner?: QueryRunner): Promise<MusicTrack> {
    await queryRunner.manager.delete(MusicTrackMetadata, { track: { id: existingTrack.id } })

    const embeddedMetadata = await this.saveEmbeddedMetadata(file, existingTrack, queryRunner)
    await this.saveFileStatMetadata(file, existingTrack, queryRunner)
    const folderStructureMetadata = await this.saveFolderStructureMetadata(file, existingTrack, queryRunner)
    const { trackArtists, releaseArtist } = await this.maybeCreateArtists(embeddedMetadata, folderStructureMetadata, queryRunner)
    const genres = await this.maybeCreateGenres(embeddedMetadata, queryRunner)
    const release = await this.maybeCreateRelease(
      embeddedMetadata,
      folderStructureMetadata,
      releaseArtist,
      trackArtists,
      genres,
      queryRunner,
    )
    const trackNumber = this.determineTrackNumber(embeddedMetadata, folderStructureMetadata)
    const discNumber = this.determineDiscNumber(embeddedMetadata, folderStructureMetadata)

    const trackTitle = (
      embeddedMetadata.find((meta) => meta.metaKey === 'title')?.metaValue
      || folderStructureMetadata.find((meta) => meta.metaKey === 'trackName')?.metaValue
      || IndexingFallbacks.UNKNOWN_TRACK
    )

    await queryRunner.manager.save(MusicTrack, {
      id: existingTrack.id,
      title: trackTitle as string,
      sortTitle: sortableString(trackTitle),
      artists: trackArtists,
      release: release,
      trackNumber: trackNumber,
      discNumber: discNumber,
      duration: Number(embeddedMetadata.find((meta) => meta.metaKey === 'duration')?.metaValue) || null,
      bitrate: Number(embeddedMetadata.find((meta) => meta.metaKey === 'bitrate')?.metaValue) || null,
    })

    const musicTrack = await this.musicTrackRepository.findOne({
      where: {
        musicTrackId: existingTrack.musicTrackId,
      },
      relations: {
        artists: true,
        release: true,
      },
    })

    this.eventService.emitPrivate(IndexingEvents.MUSIC_TRACK_UPDATED, musicTrack as unknown as Record<string, unknown>)

    return musicTrack
  }

  /**
   * Indexes a music track.
   */
  async indexMusicTrackEntities(file: File, queryRunner?: QueryRunner): Promise<MusicTrack> {
    const initialMusicTrackEntity = await this.musicTrackService.create(file, queryRunner)
    const embeddedMetadata = await this.saveEmbeddedMetadata(file, initialMusicTrackEntity, queryRunner)
    await this.saveFileStatMetadata(file, initialMusicTrackEntity, queryRunner)
    const folderStructureMetadata = await this.saveFolderStructureMetadata(file, initialMusicTrackEntity, queryRunner)
    const { trackArtists, releaseArtist } = await this.maybeCreateArtists(embeddedMetadata, folderStructureMetadata, queryRunner)
    const genres = await this.maybeCreateGenres(embeddedMetadata, queryRunner)
    const release = await this.maybeCreateRelease(
      embeddedMetadata,
      folderStructureMetadata,
      releaseArtist,
      trackArtists,
      genres,
      queryRunner,
    )
    const trackNumber = this.determineTrackNumber(embeddedMetadata, folderStructureMetadata)
    const discNumber = this.determineDiscNumber(embeddedMetadata, folderStructureMetadata)

    const trackTitle = (
      embeddedMetadata.find((meta) => meta.metaKey === 'title')?.metaValue
      || folderStructureMetadata.find((meta) => meta.metaKey === 'trackName')?.metaValue
      || IndexingFallbacks.UNKNOWN_TRACK
    )

    // Update the music track with our preferred values
    await queryRunner.manager.save(MusicTrack, {
      id: initialMusicTrackEntity.id,
      title: trackTitle as string,
      sortTitle: sortableString(trackTitle),
      artists: trackArtists,
      release: release,
      trackNumber: trackNumber,
      discNumber: discNumber,
      duration: Number(embeddedMetadata.find((meta) => meta.metaKey === 'duration')?.metaValue) || null,
      bitrate: Number(embeddedMetadata.find((meta) => meta.metaKey === 'bitrate')?.metaValue) || null,
    })

    const musicTrack = await this.musicTrackRepository.findOne({
      where: {
        musicTrackId: initialMusicTrackEntity.musicTrackId,
      },
      relations: {
        artists: true,
        release: true,
      },
    })

    this.eventService.emitPrivate(IndexingEvents.MUSIC_TRACK_ADDED, musicTrack as unknown as Record<string, unknown>)

    return musicTrack
  }

  /**
   * Reads the embedded metdadata in the file and creates database entites for it.
   */
  async saveEmbeddedMetadata(file: File, musicTrack: MusicTrack, queryRunner?: QueryRunner): Promise<MusicTrackMetadata[]> {
    let metadataToSave: Record<string, unknown>

    if (envVar('KIOSK_MODE', false)) {
      metadataToSave = buildKioskEmbeddedMetadata(file.absolutePath)
    } else {
      const metadata = await readEmbeddedMusicMetadata(file.absolutePath)

      if (!metadata?.common && !metadata?.format) {
        return []
      }

      metadataToSave = {
        ...metadata.common,
        ...metadata.format,
      }

      // contains binary data, cannot be serialized
      if ('picture' in metadataToSave) {
        delete metadataToSave.picture
      }
    }

    const rows = []

    for (const [metadataKey, metadataValue] of Object.entries(metadataToSave)) {
      const row: Partial<MusicTrackMetadata> = {
        track: musicTrack,
        metadataType: getMetadataType(metadataValue),
        metadataFormat: 'embedded',
        metaKey: metadataKey,
        metaValue: serializeMetadataValue(metadataValue),
      }

      rows.push(row)
    }

    try {
      if (queryRunner) {
        return await queryRunner.manager.save(MusicTrackMetadata, rows)
      } else {
        return await this.musicTrackRepository.save(rows)
      }
    } catch (error) {
      Logger.error(`Could not save embedded metadata for ${file?.absolutePath}`, 'Indexing')
      Logger.error(error)
      return []
    }
  }

  /**
   * Reads the file system metadata that is embedded in the file.
   */
  async saveFileStatMetadata(file: File, musicTrack: MusicTrack, queryRunner?: QueryRunner): Promise<MusicTrackMetadata[]> {
    const fileStat = envVar('KIOSK_MODE', false)
      ? buildKioskFileStatMetadata()
      : getTrustedValuesFromFileStats(file.absolutePath)
    const rows = []

    if (!fileStat) {
      return []
    }

    for (const [metadataKey, metadataValue] of Object.entries(fileStat)) {
      const row: Partial<MusicTrackMetadata> = {
        track: musicTrack,
        metadataType: 'string',
        metadataFormat: 'fs-stat',
        metaKey: metadataKey,
        metaValue: serializeMetadataValue(metadataValue),
      }

      rows.push(row)
    }

    try {
      if (queryRunner) {
        return await queryRunner.manager.save(MusicTrackMetadata, rows)
      } else {
        return await this.musicTrackRepository.save(rows)
      }
    } catch (error) {
      Logger.error(`Could not save file stat metadata for ${file?.absolutePath}`, 'Indexing')
      Logger.error(error)
      return []
    }
  }

  /**
   * Reads the embedded metdadata in the file and creates database entites for it.
   */
  async saveFolderStructureMetadata(file: File, musicTrack: MusicTrack, queryRunner?: QueryRunner): Promise<MusicTrackMetadata[]> {
    const fileStructureMetadata = envVar('KIOSK_MODE', false)
      ? buildKioskFolderStructureMetadata(file.absolutePath)
      : await this.findFolderStructureMetadata(file.absolutePath)
    const rows = []

    if (!fileStructureMetadata) {
      return []
    }

    for (const [metadataKey, metadataValue] of Object.entries(fileStructureMetadata)) {
      const row: Partial<MusicTrackMetadata> = {
        track: musicTrack,
        metadataType: 'string',
        metadataFormat: 'fs-structure',
        metaKey: metadataKey,
        metaValue: serializeMetadataValue(metadataValue),
      }

      rows.push(row)
    }

    try {
      if (queryRunner) {
        return await queryRunner.manager.save(MusicTrackMetadata, rows)
      } else {
        return await this.musicTrackRepository.save(rows)
      }
    } catch (error) {
      Logger.error(`Could not save file structure metadata for ${file?.absolutePath}`, 'Indexing')
      Logger.error(error)
      return []
    }
  }

  /**
   * Given a file path, this will try and figure out metadata based on the
   * folder and file structure.
   */
  findFolderStructureMetadata(absoluteFilePath: string): MusicFileSystemStructureMetadata {
    const trackNumber = this.findTrackNumberInFolderStructure(absoluteFilePath)
    const trackName = this.findTrackNameInFolderStructure(absoluteFilePath)
    const releaseName = this.findReleaseNameInFolderStructure(absoluteFilePath)
    const releaseYear = this.findReleaseYearInFolderStructure(absoluteFilePath)
    const artistName = this.findArtistNameInFolderStructure(absoluteFilePath)
    const discNumber = this.findDiscNumberInFolderStructure(absoluteFilePath)
    return {
      ...(trackName && { trackName }),
      ...(trackNumber && { trackNumber }),
      ...(releaseName && { releaseName }),
      ...(releaseYear && { releaseYear }),
      ...(artistName && { artistName }),
      ...(discNumber && { discNumber }),
    }
  }

  /**
   * Looks for the disc number in the folder structure.
   */
  findDiscNumberInFolderStructure(filePath: string): number | null {
    const potentialDiscPart = filePath.split(path.sep).slice(-2, -1)[0]

    const matchDisc = /disc[ -]?\d+/gi
    const matchCd = /cd[ -]?\d+/gi

    // look for "disc" or "cd" with an optionl space or dash, and then any number
    if (!(matchDisc.exec(potentialDiscPart)) && !(matchCd.exec(potentialDiscPart))) {
      return null
    }

    const matchNumbers = /\d+/g
    const matchedNumbers = matchNumbers.exec(potentialDiscPart)

    if (matchedNumbers.length) {
      return Number(matchedNumbers[0])
    }

    const fileName = filePath.split(path.sep).pop()
    const trackAndDisc = this.getTrackAndDiscNumberFromFileName(fileName)

    if (trackAndDisc.disc) {
      return trackAndDisc.disc
    }

    return null
  }

  /**
   * Looks for the artist name in the folder structure.
   */
  findArtistNameInFolderStructure(filePath: string): string | null {
    const hasDiscFolder = this.findDiscNumberInFolderStructure(filePath)
    const artistNamePart = hasDiscFolder
      ? filePath.split(path.sep).slice(-4, -3)[0]
      : filePath.split(path.sep).slice(-3, -2)[0]

    if (!artistNamePart) {
      return null
    }

    return artistNamePart
  }

  /**
   * Looks for the release year in the folder structure.
   */
  findReleaseYearInFolderStructure(filePath: string): number | null {
    const hasDiscFolder = this.findDiscNumberInFolderStructure(filePath)
    const releaseNamePart = hasDiscFolder
      ? filePath.split(path.sep).slice(-3, -2)[0]
      : filePath.split(path.sep).slice(-2, -1)[0]

    if (!releaseNamePart) {
      return null
    }

    const matched = this.matchNumberPrefix.exec(releaseNamePart)
    let releaseYear = null

    if (matched) {
      const matchNumbers = /\d+/g
      const matchedNumbers = matchNumbers.exec(matched[0])
      releaseYear = Number(matchedNumbers[0])
    }

    return releaseYear
  }

  /**
   * Looks for the release name in the folder structure.
   */
  findReleaseNameInFolderStructure(filePath: string): string | null {
    const hasDiscFolder = this.findDiscNumberInFolderStructure(filePath)
    const releaseNamePart = hasDiscFolder
      ? filePath.split(path.sep).slice(-3, -2)[0]
      : filePath.split(path.sep).slice(-2, -1)[0]

    if (!releaseNamePart) {
      return null
    }

    const releaseYear = this.matchNumberPrefix.exec(releaseNamePart)

    if (releaseYear) {
      return releaseNamePart.replace(releaseYear[0], '')
    }

    return releaseNamePart
  }

  /**
   * Looks for the track number in the folder structure.
   * 
   * https://help.cardinalapps.io/guides/cardinal-media-server/indexing/music#track-file-structure
   */
  findTrackNumberInFolderStructure(filePath: string): number | null {
    const fileName = filePath.split(path.sep).pop()
    const withoutExtension = fileName.split('.')?.[0]

    if (!withoutExtension) {
      return null
    }

    const trackAndDisc = this.getTrackAndDiscNumberFromFileName(fileName)

    return trackAndDisc.track
  }

  /**
   * Looks for the track name in the folder structure.
   */
  findTrackNameInFolderStructure(filePath: string): string | null {
    const fileName = filePath.split(path.sep).pop()
    const withoutExtension = fileName.split('.')?.[0]

    if (!withoutExtension) {
      return null
    }

    const trackNumber = this.matchNumberPrefix.exec(withoutExtension)

    if (trackNumber) {
      return withoutExtension.replace(trackNumber[0], '')
    }

    return withoutExtension
  }

  /**
   * Many music file names start with something like this to indicate track and
   * disc numbers:
   * 
   *   1 - song.mp3
   *   01 - song.mp3
   *   1-1 - song.mp3
   *   02-4 - song.mp3
   * 
   * This method takes a file name and returns the parsed track and disc number.
   */
  getTrackAndDiscNumberFromFileName(fileName): { track: number | null, disc: number | null } {
    const result = { track: null, disc: null }
    const trackAndDiscMatch = this.matchTrackAndDiscPrefix.exec(fileName)

    if (!trackAndDiscMatch || !trackAndDiscMatch.length) {
      return result
    }

    const hasBothTrackAndDisc = trackAndDiscMatch[1] && trackAndDiscMatch[2]

    if (hasBothTrackAndDisc) {
      return {
        disc: Number(trackAndDiscMatch[1]),
        track: Number(trackAndDiscMatch[2]),
      }
    } else {
      return {
        disc: null,
        track: Number(trackAndDiscMatch[1]),
      }
    }
  }

  /**
   * Creates artist entities only if we need to. Returns both the track-level
   * artists and the release-level artist separately, since they have different
   * attribution semantics.
   */
  async maybeCreateArtists(
    embeddedMetadata: MusicTrackMetadata[],
    fsMetadata: MusicTrackMetadata[],
    queryRunner?: QueryRunner,
  ): Promise<{ trackArtists: MusicArtist[], releaseArtist: MusicArtist }> {
    const artistName = this.determineReleaseArtist(embeddedMetadata, fsMetadata)
    const artist = await this.musicArtistService.getByName(artistName)
      ?? await this.musicArtistService.create(artistName, queryRunner)

    return { trackArtists: [artist], releaseArtist: artist }
  }

  /**
   * Analyzes all the given metadata to determine the proper release name.
   */
  determineReleaseTitle(embeddedMetadata?: MusicTrackMetadata[], fsMetadata?: MusicTrackMetadata[]): string | null {
    const album = embeddedMetadata.find((metadata) => metadata?.metaKey === 'album')?.metaValue
    if (album) return album

    const albumSort = embeddedMetadata.find((metadata) => metadata?.metaKey === 'albumsort')?.metaValue
    if (albumSort) return albumSort

    const fsReleaseName = fsMetadata.find((metadata) => metadata?.metaKey === 'releaseName')?.metaValue
    if (fsReleaseName) return fsReleaseName

    return IndexingFallbacks.UNKNOWN_RELEASE
  }

  /**
   * Determines the release type from embedded metadata.
   *
   * Priority:
   *   1. RELEASETYPE tag (MusicBrainz-aware taggers, e.g. Picard, beets)
   *   2. COMPILATION flag / "Various Artists" albumartist convention
   *
   * When RELEASETYPE is a multi-value list (e.g. "album; live"), the first
   * value is used. Returns null when no signal is present.
   */
  determineReleaseType(embeddedMetadata: MusicTrackMetadata[]): ReleaseType | null {
    const releaseTypeRaw = embeddedMetadata.find((m) => m.metaKey === 'releasetype')?.metaValue

    if (releaseTypeRaw) {
      const primary = releaseTypeRaw.split(/[;,]/)[0].trim().toLowerCase()
      const match = Object.values(ReleaseType).find((v) => v === primary)
      if (match) return match
    }

    if (this.isCompilationAlbum(embeddedMetadata)) {
      return ReleaseType.COMPILATION
    }

    return null
  }

  /**
   * Returns true when the track belongs to a compilation album. Checks the
   * compilation tag first, then falls back to the "Various Artists" convention.
   */
  isCompilationAlbum(embeddedMetadata: MusicTrackMetadata[]): boolean {
    const compilation = embeddedMetadata.find((m) => m.metaKey === 'compilation')?.metaValue
    if (compilation === 'true' || compilation === '1') return true

    const albumArtist = embeddedMetadata.find((m) => m.metaKey === 'albumartist')?.metaValue
    if (albumArtist?.toLowerCase() === 'various artists') return true

    return false
  }

  /**
   * Analyzes all given metadata to determine the primary artist of the release.
   * Prioritizes albumartist over artist since this is release-level attribution,
   * not track-level.
   */
  determineReleaseArtist(embeddedMetadata: MusicTrackMetadata[], fsMetadata: MusicTrackMetadata[]): string {
    const albumArtist = embeddedMetadata.find((m) => m.metaKey === 'albumartist')?.metaValue
    if (albumArtist) return albumArtist

    const albumArtistSort = embeddedMetadata.find((m) => m.metaKey === 'albumartistsort')?.metaValue
    if (albumArtistSort) return albumArtistSort

    const artist = embeddedMetadata.find((m) => m.metaKey === 'artist')?.metaValue
    if (artist) return artist

    const fsArtistName = fsMetadata.find((m) => m.metaKey === 'artistName')?.metaValue
    if (fsArtistName) return fsArtistName

    return IndexingFallbacks.UNKNOWN_ARTIST
  }

  /**
   * Creates a release entity only if we need to.
   */
  async maybeCreateRelease(
    embeddedMetadata: MusicTrackMetadata[],
    fsMetadata: MusicTrackMetadata[],
    releaseArtist: MusicArtist,
    trackArtists: MusicArtist[],
    genres: MusicGenre[],
    queryRunner?: QueryRunner,
  ): Promise<MusicRelease | null> {
    const releaseTitle = this.determineReleaseTitle(embeddedMetadata, fsMetadata)
    const releaseType = this.determineReleaseType(embeddedMetadata)
    const exists = await this.musicReleaseService.getByName(releaseTitle, releaseArtist?.name)

    if (exists) {
      if (!exists.releaseType && releaseType) {
        await this.musicReleaseService.updateReleaseType(exists.id, releaseType, queryRunner)
      }
      return exists
    }

    const releaseArtists = this.isCompilationAlbum(embeddedMetadata) ? [releaseArtist] : trackArtists
    return await this.musicReleaseService.create(releaseTitle, releaseArtist, releaseArtists, genres, releaseType, queryRunner)
  }

  /**
   * Analyzes all the given metadata to find the genres.
   */
  determineGenres(embeddedMetadata?: MusicTrackMetadata[]): string[] {
    const genres = embeddedMetadata.find((metadata) => metadata?.metaKey === 'genre')?.metaValue

    if (!genres) {
      return []
    }

    const split = genres
      .split(',')
      .map((genre) => genre.trim())
      .filter((genre) => !!genre)

    return split
  }

  /**
   * Creates genre entities only if we need to.
   */
  async maybeCreateGenres(
    embeddedMetadata: MusicTrackMetadata[],
    queryRunner?: QueryRunner,
  ): Promise<MusicGenre[]> {
    const genres = this.determineGenres(embeddedMetadata)
    const genreEntities = []

    for (const genre of genres) {
      const exists = await this.musicGenreService.getByName(genre)
      if (exists) {
        genreEntities.push(exists)
      } else {
        const created = await this.musicGenreService.create(genre, queryRunner)
        genreEntities.push(created)
      }
    }

    return genreEntities
  }

  /**
   * Analyzes all given metadata to find the track number. Defaults to 0 if nothing is found.
   */
  determineTrackNumber(embeddedMetadata?: MusicTrackMetadata[], fsMetadata?: MusicTrackMetadata[]): number {
    const fromEmbeddedMetadata = embeddedMetadata.find((metadata) => metadata?.metaKey === 'track')

    if (fromEmbeddedMetadata?.metadataType === 'object') {
      let parsed: { no?: number } | null = null
      try {
        parsed = JSON.parse(fromEmbeddedMetadata.metaValue)
      } catch {
        /* not valid JSON */
      }
      if (parsed?.no != null) {
        return parsed.no
      }
    }

    const fromFolderStructure = fsMetadata.find((meta) => meta.metaKey === 'trackNumber')?.metaValue

    if (fromFolderStructure) {
      return Number(fromFolderStructure)
    }

    return 0
  }

  /**
   * Analyzes all given metadata to find the disc number. Defaults to 1 if nothing is found.
   */
  determineDiscNumber(embeddedMetadata?: MusicTrackMetadata[], fsMetadata?: MusicTrackMetadata[]): number {
    const fromEmbeddedMetadata = embeddedMetadata.find((metadata) => metadata?.metaKey === 'disk' || metadata?.metaKey === 'disc')

    if (fromEmbeddedMetadata?.metadataType === 'object') {
      let parsed: { no?: number } | null = null
      try {
        parsed = JSON.parse(fromEmbeddedMetadata.metaValue)
      } catch {
        /* not valid JSON */
      }
      if (parsed?.no != null) {
        return parsed.no
      }
    }

    const fromFolderStructure = fsMetadata.find((meta) => meta.metaKey === 'discNumber')?.metaValue

    if (fromFolderStructure) {
      return Number(fromFolderStructure)
    }

    return 1
  }
}

/**
 * Parses the kiosk seed path format:
 *   /kiosk/artist-{n}/artist-{n}-release-{r}/artist-{n}-release-{r}-track-{t}.mp3
 *
 * Returns the segments needed by the three mock helpers below.
 */
function parseKioskPath(absolutePath: string): { artistName: string, releaseName: string, trackName: string, trackNumber: number } {
  const parts = absolutePath.split(path.sep)
  const artistName  = parts[parts.length - 3] ?? 'Unknown Artist'
  const releaseName = parts[parts.length - 2] ?? 'Unknown Release'
  const fileName    = parts[parts.length - 1] ?? ''
  const trackName   = fileName.replace(/\.mp3$/, '')

  // track number is the final numeric segment, e.g. artist-1-release-1-track-7 → 7
  const trackNumMatch = trackName.match(/-(\d+)$/)
  const trackNumber   = trackNumMatch ? Number(trackNumMatch[1]) : 1

  return { artistName, releaseName, trackName, trackNumber }
}

function buildKioskEmbeddedMetadata(absolutePath: string): Record<string, unknown> {
  const { artistName, releaseName, trackName, trackNumber } = parseKioskPath(absolutePath)
  return {
    title:       trackName,
    artist:      artistName,
    albumartist: artistName,
    album:       releaseName,
    track:       { no: trackNumber, of: 10 },
    disk:        { no: 1, of: 1 },
    duration:    180 + (trackNumber * 7),
    bitrate:     320000,
    codec:       'MP3',
    sampleRate:  44100,
    numberOfChannels: 2,
  }
}

function buildKioskFileStatMetadata(): { createdAt: string, modifiedAt: string } {
  return {
    createdAt:  new Date(0).toString(),
    modifiedAt: new Date(0).toString(),
  }
}

function buildKioskFolderStructureMetadata(absolutePath: string): Record<string, string | number> {
  const { artistName, releaseName, trackName, trackNumber } = parseKioskPath(absolutePath)
  return {
    artistName,
    releaseName,
    trackName,
    trackNumber,
  }
}
