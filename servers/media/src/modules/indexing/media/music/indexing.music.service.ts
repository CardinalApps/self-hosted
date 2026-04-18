import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm'
import { Repository, DataSource, QueryRunner } from 'typeorm'

import { File } from '../../entities/file.entity'
import { MusicTrack } from '../../../music-track/music-track.entity'
import { MusicTrackMetadata } from '../../../music-track/music-track-metadata.entity'
import { MusicTrackService } from '../../../music-track/music-track.service'
import { EventService } from '../../../event/event.service'
import { MusicArtist } from '../../../music-artist/music-artist.entity'
import { MusicArtistService } from '../../../music-artist/music-artist.service'
import { MusicRelease } from '../../../music-release/music-release.entity'
import { MusicReleaseService } from '../../../music-release/music-release.service'
import { MusicGenre } from '../../../music-genres/music-genre.entity'
import { MusicGenreService } from '../../../music-genres/music-genre.service'
import { IndexingEvents } from '../../events'

import { MusicFileSystemStructureMetadata } from '../../types'
import { IndexingFallbacks } from '../../enums'
import { ReleaseType } from '../../../music-release/enums'

import { sortableString } from '../../../../utils/string'
import {
  getMetadataType,
  serializeMetadataValue,
  getTrustedValuesFromFileStats,
  readEmbeddedMusicMetadata,
} from '../../../../utils/file'
import { envVar } from '../../../../utils/env'

import { findFolderStructureMetadata } from './indexing.music-folder-structure'
import {
  buildKioskEmbeddedMetadata,
  buildKioskFileStatMetadata,
  buildKioskFolderStructureMetadata,
} from './indexing.music-kiosk'
import {
  buildMetadataSnapshot,
  diffMetadataSnapshots,
} from './indexing.music-metadata-diff'

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
    private readonly eventService: EventService,
  ) {}

  /**
   * Indexes a music track for the first time.
   */
  async indexMusicTrackEntities(file: File, queryRunner?: QueryRunner): Promise<MusicTrack> {
    const newTrack = await this.musicTrackService.create(file, queryRunner)
    return this.upsertMusicTrack(file, newTrack, null, queryRunner)
  }

  /**
   * Re-indexes a music track that was previously indexed.
   *
   * Preserves the existing track ID. Detects which metadata fields actually
   * changed and only runs the pipeline stages that are affected by those
   * changes.
   */
  async updateMusicTrackEntities(file: File, existingTrack: MusicTrack, queryRunner?: QueryRunner): Promise<MusicTrack> {
    return this.upsertMusicTrack(file, existingTrack, existingTrack, queryRunner)
  }

  /**
   * Core implementation shared by index and update paths.
   *
   * When `existingTrack` is null this is a first-time index: all pipeline
   * stages run unconditionally. When `existingTrack` is provided this is an
   * update: metadata is diffed against the stored values and only the stages
   * that correspond to changed fields are re-run. If nothing changed at all,
   * the function returns the existing track without writing to the database.
   */
  private async upsertMusicTrack(
    file: File,
    track: MusicTrack,
    existingTrack: MusicTrack | null,
    queryRunner?: QueryRunner,
  ): Promise<MusicTrack> {
    const isUpdate = existingTrack !== null

    // Load existing track with all relations we might need as fallbacks
    let loadedExistingTrack: MusicTrack | null = null
    if (isUpdate) {
      loadedExistingTrack = await queryRunner.manager.findOne(MusicTrack, {
        where: { id: track.id },
        relations: { artists: true, release: { artist: true } },
      })
    }

    // Build all fresh metadata rows in memory (no DB write yet)
    const embeddedRows = await this.buildEmbeddedMetadataRows(file, track)
    const fsStatRows   = this.buildFsStatMetadataRows(file, track)
    const fsStructRows = this.buildFolderStructureMetadataRows(file, track)
    const allNewRows   = [...embeddedRows, ...fsStatRows, ...fsStructRows]

    // On update: diff against stored metadata and skip entirely if nothing changed
    let runArtists = true
    let runRelease = true
    let runGenres  = true
    let runScalars = true

    if (isUpdate) {
      const oldRows = await queryRunner.manager.find(MusicTrackMetadata, {
        where: { track: { id: track.id } },
      })
      const oldSnapshot = buildMetadataSnapshot(oldRows as MusicTrackMetadata[])
      const newSnapshot = buildMetadataSnapshot(allNewRows as MusicTrackMetadata[])
      const diff = diffMetadataSnapshots(oldSnapshot, newSnapshot)

      if (!diff.anyChanged) {
        return loadedExistingTrack
      }

      runArtists = diff.artistChanged
      runRelease = diff.releaseChanged
      runGenres  = diff.genreChanged
      runScalars = diff.scalarChanged
    }

    // Replace stored metadata rows with the fresh set
    if (isUpdate) {
      await queryRunner.manager.delete(MusicTrackMetadata, { track: { id: track.id } })
    }
    await this.saveMetadataRows(allNewRows, queryRunner)

    // Resolve artists
    let trackArtists: MusicArtist[] = loadedExistingTrack?.artists ?? []
    let releaseArtist: MusicArtist | null = loadedExistingTrack?.release?.artist ?? null
    let newArtists: MusicArtist[] = []

    if (runArtists) {
      const result = await this.maybeCreateArtists(embeddedRows, fsStructRows, queryRunner)
      trackArtists  = result.trackArtists
      releaseArtist = result.releaseArtist
      newArtists    = result.newArtists
    }

    // Resolve genres
    let genres: MusicGenre[] = []
    let newGenres: MusicGenre[] = []

    if (runGenres) {
      const result = await this.maybeCreateGenres(embeddedRows, queryRunner)
      genres    = result.genres
      newGenres = result.newGenres
    }

    // Resolve release
    let release: MusicRelease | null = loadedExistingTrack?.release ?? null
    let releaseCreated = false
    let releaseTypeUpdated = false

    if (runRelease) {
      const result = await this.maybeCreateRelease(
        embeddedRows,
        fsStructRows,
        releaseArtist,
        trackArtists,
        genres,
        queryRunner,
      )
      release            = result.release
      releaseCreated     = result.created
      releaseTypeUpdated = result.releaseTypeUpdated
    }

    // Save scalar and relation updates to the MusicTrack row
    if (runScalars || runArtists || runRelease) {
      const payload: Partial<MusicTrack> & { id: number } = { id: track.id }

      if (runScalars) {
        const trackTitle = (
          embeddedRows.find((r) => r.metaKey === 'title')?.metaValue
          || fsStructRows.find((r) => r.metaKey === 'trackName')?.metaValue
          || IndexingFallbacks.UNKNOWN_TRACK
        ) as string

        payload.title       = trackTitle
        payload.sortTitle   = sortableString(trackTitle)
        payload.trackNumber = this.determineTrackNumber(embeddedRows, fsStructRows)
        payload.discNumber  = this.determineDiscNumber(embeddedRows, fsStructRows)
        payload.duration    = Number(embeddedRows.find((r) => r.metaKey === 'duration')?.metaValue) || null
        payload.bitrate     = Number(embeddedRows.find((r) => r.metaKey === 'bitrate')?.metaValue)  || null
      }

      if (runArtists) {
        payload.artists = trackArtists
      }

      if (runRelease) {
        payload.release = release
      }

      await queryRunner.manager.save(MusicTrack, payload)
    }

    // Fetch the fully populated track
    const musicTrack = await this.musicTrackRepository.findOne({
      where: { musicTrackId: track.musicTrackId },
      relations: { artists: true, release: true },
    })

    // Emit public events for any side-effect entities
    for (const artist of newArtists) {
      this.eventService.emitPublic(IndexingEvents.MUSIC_ARTIST_ADDED, artist as unknown as Record<string, unknown>)
    }

    for (const genre of newGenres) {
      this.eventService.emitPublic(IndexingEvents.MUSIC_GENRE_ADDED, genre as unknown as Record<string, unknown>)
    }

    if (releaseCreated) {
      this.eventService.emitPublic(IndexingEvents.MUSIC_RELEASE_ADDED, release as unknown as Record<string, unknown>)
    } else if (releaseTypeUpdated) {
      this.eventService.emitPublic(IndexingEvents.MUSIC_RELEASE_UPDATED, release as unknown as Record<string, unknown>)
    }

    if (isUpdate) {
      this.eventService.emitPrivate(IndexingEvents.MUSIC_TRACK_UPDATED, musicTrack as unknown as Record<string, unknown>)
    } else {
      this.eventService.emitPrivate(IndexingEvents.MUSIC_TRACK_ADDED, musicTrack as unknown as Record<string, unknown>)
    }

    return musicTrack
  }

  // ---------------------------------------------------------------------------
  // Metadata row builders
  // ---------------------------------------------------------------------------

  /**
   * Reads the embedded metadata in the file and builds MusicTrackMetadata row
   * shapes. Does not write to the database.
   */
  private async buildEmbeddedMetadataRows(file: File, track: MusicTrack): Promise<Partial<MusicTrackMetadata>[]> {
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

    return Object.entries(metadataToSave).map(([metadataKey, metadataValue]) => ({
      track,
      metadataType: getMetadataType(metadataValue),
      metadataFormat: 'embedded',
      metaKey: metadataKey,
      metaValue: serializeMetadataValue(metadataValue),
    } as Partial<MusicTrackMetadata>))
  }

  /**
   * Reads filesystem stat metadata and builds MusicTrackMetadata row shapes.
   * Does not write to the database.
   */
  private buildFsStatMetadataRows(file: File, track: MusicTrack): Partial<MusicTrackMetadata>[] {
    const fileStat = envVar('KIOSK_MODE', false)
      ? buildKioskFileStatMetadata()
      : getTrustedValuesFromFileStats(file.absolutePath)

    if (!fileStat) {
      return []
    }

    return Object.entries(fileStat).map(([metadataKey, metadataValue]) => ({
      track,
      metadataType: 'string',
      metadataFormat: 'fs-stat',
      metaKey: metadataKey,
      metaValue: serializeMetadataValue(metadataValue),
    } as Partial<MusicTrackMetadata>))
  }

  /**
   * Parses the folder structure of the file path and builds MusicTrackMetadata
   * row shapes. Does not write to the database.
   */
  private buildFolderStructureMetadataRows(file: File, track: MusicTrack): Partial<MusicTrackMetadata>[] {
    const fileStructureMetadata: MusicFileSystemStructureMetadata = envVar('KIOSK_MODE', false)
      ? buildKioskFolderStructureMetadata(file.absolutePath) as MusicFileSystemStructureMetadata
      : findFolderStructureMetadata(file.absolutePath)

    if (!fileStructureMetadata) {
      return []
    }

    return Object.entries(fileStructureMetadata).map(([metadataKey, metadataValue]) => ({
      track,
      metadataType: 'string',
      metadataFormat: 'fs-structure',
      metaKey: metadataKey,
      metaValue: serializeMetadataValue(metadataValue),
    } as Partial<MusicTrackMetadata>))
  }

  /**
   * Saves a set of metadata rows to the database.
   */
  private async saveMetadataRows(
    rows: Partial<MusicTrackMetadata>[],
    queryRunner?: QueryRunner,
  ): Promise<MusicTrackMetadata[]> {
    if (!rows.length) {
      return []
    }

    try {
      if (queryRunner) {
        return await queryRunner.manager.save(MusicTrackMetadata, rows)
      } else {
        return await this.musicTrackMetadataRepository.save(rows)
      }
    } catch (error) {
      Logger.error('Could not save metadata rows', 'Indexing')
      Logger.error(error)
      return []
    }
  }

  // ---------------------------------------------------------------------------
  // Artist / release / genre pipeline
  // ---------------------------------------------------------------------------

  /**
   * Creates artist entities only if we need to. Returns both the track-level
   * artists and the release-level artist separately, since they have different
   * attribution semantics. Also returns any artists that were newly created.
   */
  private async maybeCreateArtists(
    embeddedMetadata: Partial<MusicTrackMetadata>[],
    fsMetadata: Partial<MusicTrackMetadata>[],
    queryRunner?: QueryRunner,
  ): Promise<{ trackArtists: MusicArtist[], releaseArtist: MusicArtist, newArtists: MusicArtist[] }> {
    const artistName = this.determineReleaseArtist(embeddedMetadata, fsMetadata)
    const existing = await this.musicArtistService.getByName(artistName)

    let artist: MusicArtist
    let newArtists: MusicArtist[] = []

    if (existing) {
      artist = existing
    } else {
      artist = await this.musicArtistService.create(artistName, queryRunner)
      newArtists = [artist]
    }

    return { trackArtists: [artist], releaseArtist: artist, newArtists }
  }

  /**
   * Creates a release entity only if we need to. Returns the release, whether
   * it was newly created, and whether the release type was updated on an
   * existing release.
   */
  private async maybeCreateRelease(
    embeddedMetadata: Partial<MusicTrackMetadata>[],
    fsMetadata: Partial<MusicTrackMetadata>[],
    releaseArtist: MusicArtist,
    trackArtists: MusicArtist[],
    genres: MusicGenre[],
    queryRunner?: QueryRunner,
  ): Promise<{ release: MusicRelease | null, created: boolean, releaseTypeUpdated: boolean }> {
    const releaseTitle = this.determineReleaseTitle(embeddedMetadata, fsMetadata)
    const releaseType  = this.determineReleaseType(embeddedMetadata)
    const exists       = await this.musicReleaseService.getByName(releaseTitle, releaseArtist?.name)

    if (exists) {
      let releaseTypeUpdated = false
      if (!exists.releaseType && releaseType) {
        await this.musicReleaseService.updateReleaseType(exists.id, releaseType, queryRunner)
        releaseTypeUpdated = true
      }
      return { release: exists, created: false, releaseTypeUpdated }
    }

    const releaseArtists = this.isCompilationAlbum(embeddedMetadata) ? [releaseArtist] : trackArtists
    const release = await this.musicReleaseService.create(
      releaseTitle,
      releaseArtist,
      releaseArtists,
      genres,
      releaseType,
      queryRunner,
    )

    return { release, created: true, releaseTypeUpdated: false }
  }

  /**
   * Creates genre entities only if we need to. Returns all genres and any that
   * were newly created.
   */
  private async maybeCreateGenres(
    embeddedMetadata: Partial<MusicTrackMetadata>[],
    queryRunner?: QueryRunner,
  ): Promise<{ genres: MusicGenre[], newGenres: MusicGenre[] }> {
    const genreNames  = this.determineGenres(embeddedMetadata)
    const genres: MusicGenre[]    = []
    const newGenres: MusicGenre[] = []

    for (const name of genreNames) {
      const exists = await this.musicGenreService.getByName(name)
      if (exists) {
        genres.push(exists)
      } else {
        const created = await this.musicGenreService.create(name, queryRunner)
        genres.push(created)
        newGenres.push(created)
      }
    }

    return { genres, newGenres }
  }

  // ---------------------------------------------------------------------------
  // Metadata analysis helpers
  // ---------------------------------------------------------------------------

  /**
   * Analyzes all the given metadata to determine the proper release name.
   */
  determineReleaseTitle(embeddedMetadata?: Partial<MusicTrackMetadata>[], fsMetadata?: Partial<MusicTrackMetadata>[]): string | null {
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
  determineReleaseType(embeddedMetadata: Partial<MusicTrackMetadata>[]): ReleaseType | null {
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
  isCompilationAlbum(embeddedMetadata: Partial<MusicTrackMetadata>[]): boolean {
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
  determineReleaseArtist(embeddedMetadata: Partial<MusicTrackMetadata>[], fsMetadata: Partial<MusicTrackMetadata>[]): string {
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
   * Analyzes all the given metadata to find the genres.
   */
  determineGenres(embeddedMetadata?: Partial<MusicTrackMetadata>[]): string[] {
    const genres = embeddedMetadata.find((metadata) => metadata?.metaKey === 'genre')?.metaValue

    if (!genres) {
      return []
    }

    return genres
      .split(',')
      .map((genre) => genre.trim())
      .filter((genre) => !!genre)
  }

  /**
   * Analyzes all given metadata to find the track number. Defaults to 0 if nothing is found.
   */
  determineTrackNumber(embeddedMetadata?: Partial<MusicTrackMetadata>[], fsMetadata?: Partial<MusicTrackMetadata>[]): number {
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
  determineDiscNumber(embeddedMetadata?: Partial<MusicTrackMetadata>[], fsMetadata?: Partial<MusicTrackMetadata>[]): number {
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
