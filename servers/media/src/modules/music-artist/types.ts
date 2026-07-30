/**
 * One audio format found among an artist's tracks, with its share of the
 * artist's footprint on disk.
 */
export type MusicArtistFormat = {
  extension: string
  numTracks: number
  bytes: number
  avgBitrate: number | null
  minDuration: number | null
  maxDuration: number | null
}

/**
 * How many of an artist's releases carry a given genre.
 */
export type MusicArtistGenre = {
  name: string
  numReleases: number
}

/**
 * One of the artist's releases: enough of the row itself for the artist page
 * to render its timeline without loading the release relations, plus the
 * figures that aren't columns on the release row.
 */
export type MusicArtistReleaseSummary = {
  id: number
  musicReleaseId: string
  title: string | null
  releaseType: string | null
  hasArtwork: boolean
  /** The consensus year across the release's tracks, from embedded tags. */
  year: number | null
  numTracks: number
  runtimeSeconds: number
  bytes: number
  /** Every file extension found on the release, most common first. */
  extensions: string[]
  /** True when every file on the release is a lossless format. */
  lossless: boolean
}

/**
 * One track's footprint on disk. This is what the DiskMap is drawn from: it
 * carries no more of the track than the map needs to place and label a block.
 */
export type MusicArtistTrackFile = {
  musicTrackId: string
  musicReleaseId: string | null
  title: string | null
  bytes: number
  extension: string
  lossless: boolean
}

/**
 * The current user's listening record for one of the artist's releases.
 */
export type MusicArtistReleaseListening = {
  musicReleaseId: string
  numTracks: number
  tracksHeard: number
  plays: number
  favorites: number
  lastPlayedAt: string | null
}

/**
 * The current user's listening record for the artist as a whole. Only ever
 * present when the request was made by a logged in user.
 */
export type MusicArtistListening = {
  plays: number
  tracksHeard: number
  favorites: number
  firstPlayedAt: string | null
  lastPlayedAt: string | null
  releases: MusicArtistReleaseListening[]
}

/**
 * Everything the Music app's artist page needs that is not a plain column on
 * the artist row. Computed per request; see MusicArtistSummaryService.
 */
export type MusicArtistSummary = {
  numReleases: number
  numTracks: number
  runtimeSeconds: number
  shortestTrackSeconds: number | null
  longestTrackSeconds: number | null
  firstYear: number | null
  lastYear: number | null
  genres: MusicArtistGenre[]
  labels: string[]
  bytes: number
  formats: MusicArtistFormat[]
  numLossless: number
  sampleRates: number[]
  bitDepths: number[]
  encoders: string[]
  mediaTypes: string[]
  countries: string[]
  integratedLufs: number | null
  truePeakDb: number | null
  musicbrainzArtistId: string | null
  releases: MusicArtistReleaseSummary[]
  files: MusicArtistTrackFile[]
  listening?: MusicArtistListening
}

/**
 * Track metadata keys the summary reads. Everything else on a track is
 * ignored, which keeps the metadata query's result set small.
 */
export const SUMMARY_META_KEYS = [
  'year',
  'releaseYear',
  'originalyear',
  'label',
  'releasecountry',
  'media',
  'sampleRate',
  'bitsPerSample',
  'lossless',
  'tool',
  'musicbrainz_artistid',
] as const
