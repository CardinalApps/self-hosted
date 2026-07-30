import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { MusicArtist } from './music-artist.entity'
import { MusicTrack } from '../music-track/music-track.entity'
import { MusicRelease } from '../music-release/music-release.entity'
import { MusicTrackMetadata } from '../music-track/music-track-metadata.entity'
import { MusicTrackWaveform } from '../music-track/music-track-waveform.entity'
import { MusicHistory } from '../music-history/music-history.entity'
import { Rating, RatingMediaType } from '../rating/rating.entity'
import { User } from '../user/user.entity'

import {
  MusicArtistFormat,
  MusicArtistGenre,
  MusicArtistListening,
  MusicArtistReleaseListening,
  MusicArtistReleaseSummary,
  MusicArtistSummary,
  MusicArtistTrackFile,
  SUMMARY_META_KEYS,
} from './types'

/* Postgres returns SUM/COUNT of an integer column as a bigint, which the driver hands back as
   a string, while SQLite returns a number. Every aggregate read below goes through these. */
const toInt = (value: unknown): number => {
  const parsed = parseInt(String(value ?? ''), 10)
  return Number.isFinite(parsed) ? parsed : 0
}

const toFloatOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

// Timestamps come back as a Date on Postgres and a string on SQLite
const toIsoOrNull = (value: unknown): string | null => {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

// Lossless formats, used to split the bitrate story between lossy and lossless rips
const LOSSLESS_EXTENSIONS = new Set(['flac', 'alac', 'wav', 'aiff', 'aif', 'ape', 'wv'])

type MetaTally = Map<string, Map<string, number>>

@Injectable()
export class MusicArtistSummaryService {
  constructor(
    @InjectRepository(MusicArtist)
    private musicArtistRepository: Repository<MusicArtist>,

    @InjectRepository(MusicTrack)
    private musicTrackRepository: Repository<MusicTrack>,

    @InjectRepository(MusicRelease)
    private musicReleaseRepository: Repository<MusicRelease>,

    @InjectRepository(MusicTrackMetadata)
    private musicTrackMetadataRepository: Repository<MusicTrackMetadata>,

    @InjectRepository(MusicTrackWaveform)
    private musicTrackWaveformRepository: Repository<MusicTrackWaveform>,

    @InjectRepository(MusicHistory)
    private musicHistoryRepository: Repository<MusicHistory>,

    @InjectRepository(Rating)
    private ratingRepository: Repository<Rating>,
  ) {}

  /**
   * Builds the artist page summary. Every figure is derived from the artist's
   * own tracks at request time; nothing here is denormalized onto the artist
   * row, because half of it (the listening record) is per-user anyway.
   */
  async getSummary(artist: MusicArtist, user?: User): Promise<MusicArtistSummary> {
    const [formats, waveform, meta, genres, numReleases, files, releases] = await Promise.all([
      this.getFormats(artist.id),
      this.getLoudness(artist.id),
      this.getMetaTally(artist.id),
      this.getGenres(artist.id),
      this.countReleases(artist.id),
      this.getTrackFiles(artist.id),
      this.getReleaseSummaries(artist.id),
    ])

    const numTracks = formats.reduce((sum, format) => sum + format.numTracks, 0)
    const bytes = formats.reduce((sum, format) => sum + format.bytes, 0)
    const numLossless = formats
      .filter((format) => LOSSLESS_EXTENSIONS.has(format.extension.toLowerCase()))
      .reduce((sum, format) => sum + format.numTracks, 0)

    const durations = formats
      .flatMap((format) => [format.minDuration, format.maxDuration])
      .filter((duration): duration is number => duration !== null)

    const years = this.numericValues(meta, ['year', 'releaseYear', 'originalyear'])

    const summary: MusicArtistSummary = {
      numReleases,
      numTracks,
      runtimeSeconds: await this.getRuntimeSeconds(artist.id),
      shortestTrackSeconds: durations.length ? Math.min(...durations) : null,
      longestTrackSeconds: durations.length ? Math.max(...durations) : null,
      firstYear: years.length ? Math.min(...years) : null,
      lastYear: years.length ? Math.max(...years) : null,
      genres,
      labels: this.distinctValues(meta, 'label'),
      bytes,
      formats,
      numLossless,
      sampleRates: this.numericValues(meta, ['sampleRate']),
      bitDepths: this.numericValues(meta, ['bitsPerSample']),
      encoders: this.distinctValues(meta, 'tool'),
      mediaTypes: this.distinctValues(meta, 'media'),
      countries: this.distinctValues(meta, 'releasecountry'),
      integratedLufs: waveform.integratedLufs,
      truePeakDb: waveform.truePeakDb,
      musicbrainzArtistId: this.mostCommonValue(meta, 'musicbrainz_artistid'),
      releases,
      files,
    }

    if (user) {
      summary.listening = await this.getListening(artist.id, user)
    }

    return summary
  }

  /**
   * Per-format track counts and disk footprint. This is the query the DiskMap
   * and the whole "on disk" column are built from.
   */
  private async getFormats(artistId: number): Promise<MusicArtistFormat[]> {
    const rows = await this.musicTrackRepository
      .createQueryBuilder('track')
      .innerJoin('track.artists', 'artist')
      .innerJoin('track.file', 'file')
      .where('artist.id = :artistId', { artistId })
      .select('file.extension', 'extension')
      .addSelect('COUNT(track.id)', 'numTracks')
      .addSelect('SUM(file.size)', 'bytes')
      .addSelect('AVG(track.bitrate)', 'avgBitrate')
      .addSelect('MIN(track.duration)', 'minDuration')
      .addSelect('MAX(track.duration)', 'maxDuration')
      .groupBy('file.extension')
      .getRawMany()

    return rows.map((row) => ({
      extension: String(row.extension ?? ''),
      numTracks: toInt(row.numTracks),
      bytes: toInt(row.bytes),
      avgBitrate: toFloatOrNull(row.avgBitrate),
      minDuration: toFloatOrNull(row.minDuration),
      maxDuration: toFloatOrNull(row.maxDuration),
    }))
  }

  /**
   * Total runtime. Kept separate from the per-format query so that tracks with
   * no indexed file still count toward the artist's runtime.
   */
  private async getRuntimeSeconds(artistId: number): Promise<number> {
    const row = await this.musicTrackRepository
      .createQueryBuilder('track')
      .innerJoin('track.artists', 'artist')
      .where('artist.id = :artistId', { artistId })
      .select('SUM(track.duration)', 'runtime')
      .getRawOne()

    return Math.round(toFloatOrNull(row?.runtime) ?? 0)
  }

  /**
   * Mastering loudness across the artist's catalogue. Average integrated
   * loudness, and the hottest true peak of any single track.
   */
  private async getLoudness(artistId: number): Promise<{ integratedLufs: number | null, truePeakDb: number | null }> {
    const row = await this.musicTrackWaveformRepository
      .createQueryBuilder('waveform')
      .innerJoin('waveform.track', 'track')
      .innerJoin('track.artists', 'artist')
      .where('artist.id = :artistId', { artistId })
      .select('AVG(waveform.integratedLufs)', 'integratedLufs')
      .addSelect('MAX(waveform.truePeakDb)', 'truePeakDb')
      .getRawOne()

    return {
      integratedLufs: toFloatOrNull(row?.integratedLufs),
      truePeakDb: toFloatOrNull(row?.truePeakDb),
    }
  }

  /**
   * Tallies every value of the handful of metadata keys the summary cares
   * about, so that a key with disagreeing values across tracks can still
   * report a catalogue-wide consensus.
   */
  private async getMetaTally(artistId: number): Promise<MetaTally> {
    const rows = await this.musicTrackMetadataRepository
      .createQueryBuilder('meta')
      .innerJoin('meta.track', 'track')
      .innerJoin('track.artists', 'artist')
      .where('artist.id = :artistId', { artistId })
      .andWhere('meta.metaKey IN (:...keys)', { keys: [...SUMMARY_META_KEYS] })
      .select('meta.metaKey', 'metaKey')
      .addSelect('meta.metaValue', 'metaValue')
      .addSelect('COUNT(meta.id)', 'numTracks')
      .groupBy('meta.metaKey')
      .addGroupBy('meta.metaValue')
      .getRawMany()

    const tally: MetaTally = new Map()

    for (const row of rows) {
      const key = String(row.metaKey ?? '')
      /* Tags carry whatever padding the ripper left in them, and "LAME 3.99r" and
         "LAME 3.99r " would otherwise be tallied as two different encoders. */
      const value = row.metaValue === null || row.metaValue === undefined ? '' : String(row.metaValue).trim()
      if (!key || !value.length) continue
      if (!tally.has(key)) tally.set(key, new Map())
      const values = tally.get(key)
      values.set(value, (values.get(value) ?? 0) + toInt(row.numTracks))
    }

    return tally
  }

  /**
   * Genres carried by the artist's releases, most widely used first.
   */
  private async getGenres(artistId: number): Promise<MusicArtistGenre[]> {
    const rows = await this.musicReleaseRepository
      .createQueryBuilder('release')
      .innerJoin('release.artists', 'artist')
      .innerJoin('release.genres', 'genre')
      .where('artist.id = :artistId', { artistId })
      .select('genre.name', 'name')
      .addSelect('COUNT(DISTINCT release.id)', 'numReleases')
      .groupBy('genre.name')
      .getRawMany()

    return rows
      .map((row) => ({ name: String(row.name ?? ''), numReleases: toInt(row.numReleases) }))
      .filter((genre) => !!genre.name.length)
      .sort((a, b) => b.numReleases - a.numReleases || a.name.localeCompare(b.name))
  }

  /**
   * Every track's size on disk, which is all the DiskMap needs to lay itself
   * out. Tracks with no indexed file are left out; they occupy no disk.
   */
  private async getTrackFiles(artistId: number): Promise<MusicArtistTrackFile[]> {
    const rows = await this.musicTrackRepository
      .createQueryBuilder('track')
      .innerJoin('track.artists', 'artist')
      .innerJoin('track.file', 'file')
      .leftJoin('track.release', 'release')
      .where('artist.id = :artistId', { artistId })
      .select('track.musicTrackId', 'musicTrackId')
      .addSelect('release.musicReleaseId', 'musicReleaseId')
      .addSelect('track.title', 'title')
      .addSelect('file.size', 'bytes')
      .addSelect('file.extension', 'extension')
      .orderBy('release.createdAt', 'DESC')
      .addOrderBy('track.discNumber', 'ASC')
      .addOrderBy('track.trackNumber', 'ASC')
      .getRawMany()

    return rows.map((row) => {
      const extension = String(row.extension ?? '')
      return {
        musicTrackId: String(row.musicTrackId ?? ''),
        musicReleaseId: row.musicReleaseId ? String(row.musicReleaseId) : null,
        title: row.title ? String(row.title) : null,
        bytes: toInt(row.bytes),
        extension,
        lossless: LOSSLESS_EXTENSIONS.has(extension.toLowerCase()),
      }
    })
  }

  /**
   * Per-release figures for the timeline. The year is the consensus across the
   * release's own tracks, since release rows carry no metadata of their own.
   * Every release of the artist's is listed, tracks or not, so the page can
   * draw its timeline from the summary alone.
   */
  private async getReleaseSummaries(artistId: number): Promise<MusicArtistReleaseSummary[]> {
    const [identityRows, aggregateRows, yearRows] = await Promise.all([
      this.musicReleaseRepository
        .createQueryBuilder('release')
        .innerJoin('release.artists', 'artist')
        .leftJoin('release.thumbnails', 'thumbnail')
        .where('artist.id = :artistId', { artistId })
        .select('release.id', 'id')
        .addSelect('release.musicReleaseId', 'musicReleaseId')
        .addSelect('release.title', 'title')
        .addSelect('release.releaseType', 'releaseType')
        .addSelect('COUNT(thumbnail.id)', 'numThumbnails')
        .groupBy('release.id')
        .addGroupBy('release.musicReleaseId')
        .addGroupBy('release.title')
        .addGroupBy('release.releaseType')
        .getRawMany(),

      this.musicReleaseRepository
        .createQueryBuilder('release')
        .innerJoin('release.artists', 'artist')
        .innerJoin('release.tracks', 'track')
        .leftJoin('track.file', 'file')
        .where('artist.id = :artistId', { artistId })
        .select('release.musicReleaseId', 'musicReleaseId')
        .addSelect('file.extension', 'extension')
        .addSelect('COUNT(DISTINCT track.id)', 'numTracks')
        .addSelect('SUM(track.duration)', 'runtime')
        .addSelect('SUM(file.size)', 'bytes')
        .groupBy('release.musicReleaseId')
        .addGroupBy('file.extension')
        .getRawMany(),

      this.musicTrackMetadataRepository
        .createQueryBuilder('meta')
        .innerJoin('meta.track', 'track')
        .innerJoin('track.artists', 'artist')
        .innerJoin('track.release', 'release')
        .where('artist.id = :artistId', { artistId })
        .andWhere('meta.metaKey IN (:...keys)', { keys: ['year', 'releaseYear', 'originalyear'] })
        .select('release.musicReleaseId', 'musicReleaseId')
        .addSelect('meta.metaValue', 'metaValue')
        .addSelect('COUNT(meta.id)', 'numTracks')
        .groupBy('release.musicReleaseId')
        .addGroupBy('meta.metaValue')
        .getRawMany(),
    ])

    // The most widely tagged year wins, so one mistagged track can't move a release
    const yearVotes = new Map<string, Map<number, number>>()

    for (const row of yearRows) {
      const releaseId = String(row.musicReleaseId ?? '')
      const year = parseInt(String(row.metaValue ?? ''), 10)
      if (!releaseId || !Number.isFinite(year)) continue
      if (!yearVotes.has(releaseId)) yearVotes.set(releaseId, new Map())
      const votes = yearVotes.get(releaseId)
      votes.set(year, (votes.get(year) ?? 0) + toInt(row.numTracks))
    }

    const byRelease = new Map<string, MusicArtistReleaseSummary & { extensionCounts: Map<string, number> }>()

    for (const row of identityRows) {
      const musicReleaseId = String(row.musicReleaseId ?? '')
      if (!musicReleaseId) continue

      byRelease.set(musicReleaseId, {
        id: toInt(row.id),
        musicReleaseId,
        title: row.title ? String(row.title) : null,
        releaseType: row.releaseType ? String(row.releaseType) : null,
        hasArtwork: toInt(row.numThumbnails) > 0,
        year: null,
        numTracks: 0,
        runtimeSeconds: 0,
        bytes: 0,
        extensions: [],
        lossless: true,
        extensionCounts: new Map(),
      })
    }

    for (const row of aggregateRows) {
      const musicReleaseId = String(row.musicReleaseId ?? '')
      if (!byRelease.has(musicReleaseId)) continue

      const release = byRelease.get(musicReleaseId)
      const extension = String(row.extension ?? '')
      const numTracks = toInt(row.numTracks)

      release.numTracks += numTracks
      release.runtimeSeconds += Math.round(toFloatOrNull(row.runtime) ?? 0)
      release.bytes += toInt(row.bytes)

      if (extension.length) {
        release.extensionCounts.set(extension, (release.extensionCounts.get(extension) ?? 0) + numTracks)
        if (!LOSSLESS_EXTENSIONS.has(extension.toLowerCase())) {
          release.lossless = false
        }
      }
    }

    return Array.from(byRelease.values()).map(({ extensionCounts, ...release }) => {
      const votes = yearVotes.get(release.musicReleaseId)
      const year = votes?.size
        ? Array.from(votes.entries()).sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0]
        : null

      return {
        ...release,
        year,
        extensions: Array.from(extensionCounts.entries())
          .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
          .map(([extension]) => extension),
        // A release with no indexed files can't be called lossless
        lossless: extensionCounts.size > 0 && release.lossless,
      }
    })
  }

  private async countReleases(artistId: number): Promise<number> {
    return await this.musicReleaseRepository
      .createQueryBuilder('release')
      .innerJoin('release.artists', 'artist')
      .where('artist.id = :artistId', { artistId })
      .getCount()
  }

  /**
   * The current user's listening record for this artist.
   */
  private async getListening(artistId: number, user: User): Promise<MusicArtistListening> {
    const [totals, favorites, releases] = await Promise.all([
      this.getListeningTotals(artistId, user),
      this.countFavorites(artistId, user),
      this.getReleaseListening(artistId, user),
    ])

    return { ...totals, favorites, releases }
  }

  private async getListeningTotals(
    artistId: number,
    user: User,
  ): Promise<Omit<MusicArtistListening, 'favorites' | 'releases'>> {
    const row = await this.musicHistoryRepository
      .createQueryBuilder('history')
      .innerJoin('history.track', 'track')
      .innerJoin('track.artists', 'artist')
      .where('artist.id = :artistId', { artistId })
      .andWhere('history.user_id = :userId', { userId: user.id })
      .select('COUNT(history.id)', 'plays')
      .addSelect('COUNT(DISTINCT track.id)', 'tracksHeard')
      .addSelect('MIN(history.createdAt)', 'firstPlayedAt')
      .addSelect('MAX(history.updatedAt)', 'lastPlayedAt')
      .getRawOne()

    return {
      plays: toInt(row?.plays),
      tracksHeard: toInt(row?.tracksHeard),
      firstPlayedAt: toIsoOrNull(row?.firstPlayedAt),
      lastPlayedAt: toIsoOrNull(row?.lastPlayedAt),
    }
  }

  /**
   * Ratings are keyed by the public track ID rather than a foreign key, so this
   * joins on musicTrackId instead of a relation.
   */
  private async countFavorites(artistId: number, user: User): Promise<number> {
    const row = await this.ratingRepository
      .createQueryBuilder('rating')
      .innerJoin(MusicTrack, 'track', 'track.music_track_id = rating.media_id')
      .innerJoin('track.artists', 'artist')
      .where('artist.id = :artistId', { artistId })
      .andWhere('rating.user_id = :userId', { userId: user.id })
      .andWhere('rating.media_type = :mediaType', { mediaType: RatingMediaType.MUSIC_TRACK })
      .select('COUNT(rating.id)', 'favorites')
      .getRawOne()

    return toInt(row?.favorites)
  }

  /**
   * Per-release listening, which drives the coverage bars on the timeline.
   * Plays and favorites are counted in separate passes because joining both
   * history and ratings at once multiplies one by the other.
   */
  private async getReleaseListening(artistId: number, user: User): Promise<MusicArtistReleaseListening[]> {
    const playRows = await this.musicReleaseRepository
      .createQueryBuilder('release')
      .innerJoin('release.artists', 'artist')
      .innerJoin('release.tracks', 'track')
      .leftJoin('track.history', 'history', 'history.user_id = :userId', { userId: user.id })
      .where('artist.id = :artistId', { artistId })
      .select('release.musicReleaseId', 'musicReleaseId')
      .addSelect('COUNT(DISTINCT track.id)', 'numTracks')
      .addSelect('COUNT(DISTINCT history.track_id)', 'tracksHeard')
      .addSelect('COUNT(history.id)', 'plays')
      .addSelect('MAX(history.updatedAt)', 'lastPlayedAt')
      .groupBy('release.musicReleaseId')
      .getRawMany()

    const favoriteRows = await this.musicReleaseRepository
      .createQueryBuilder('release')
      .innerJoin('release.artists', 'artist')
      .innerJoin('release.tracks', 'track')
      .innerJoin(
        Rating,
        'rating',
        'rating.media_id = track.music_track_id AND rating.media_type = :mediaType AND rating.user_id = :userId',
        { mediaType: RatingMediaType.MUSIC_TRACK, userId: user.id },
      )
      .where('artist.id = :artistId', { artistId })
      .select('release.musicReleaseId', 'musicReleaseId')
      .addSelect('COUNT(rating.id)', 'favorites')
      .groupBy('release.musicReleaseId')
      .getRawMany()

    const favoritesByRelease = new Map(
      favoriteRows.map((row) => [String(row.musicReleaseId), toInt(row.favorites)]),
    )

    return playRows.map((row) => {
      const musicReleaseId = String(row.musicReleaseId ?? '')
      return {
        musicReleaseId,
        numTracks: toInt(row.numTracks),
        tracksHeard: toInt(row.tracksHeard),
        plays: toInt(row.plays),
        favorites: favoritesByRelease.get(musicReleaseId) ?? 0,
        lastPlayedAt: toIsoOrNull(row.lastPlayedAt),
      }
    })
  }

  // ─── Metadata tally readers ────────────────────────────────────────────────

  /**
   * Every distinct value of a key, most widely used first.
   */
  private distinctValues(tally: MetaTally, key: string): string[] {
    const values = tally.get(key)
    if (!values?.size) return []
    return Array.from(values.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([value]) => value)
  }

  /**
   * The numeric values found across one or more keys, ascending. Used for
   * fields where several tag dialects carry the same fact, e.g. release year.
   */
  private numericValues(tally: MetaTally, keys: string[]): number[] {
    const found = new Set<number>()

    for (const key of keys) {
      for (const value of tally.get(key)?.keys() ?? []) {
        const parsed = parseInt(value, 10)
        if (Number.isFinite(parsed)) found.add(parsed)
      }
    }

    return Array.from(found).sort((a, b) => a - b)
  }

  private mostCommonValue(tally: MetaTally, key: string): string | null {
    return this.distinctValues(tally, key)[0] ?? null
  }
}
