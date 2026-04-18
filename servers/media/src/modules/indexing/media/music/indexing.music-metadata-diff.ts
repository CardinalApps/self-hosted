import { MusicTrackMetadata } from '../../../music-track/music-track-metadata.entity'

/**
 * A flat map of `"<metadataFormat>:<metaKey>" => serializedValue` for one
 * track's complete metadata snapshot. Keys are namespaced by format to prevent
 * collisions between e.g. `embedded:track` and `fs-structure:trackNumber`.
 */
export type MetadataSnapshot = Map<string, string | null>

/**
 * Which groups of derived fields changed between two snapshots.
 * Each flag being `true` means the corresponding pipeline step should re-run.
 */
export type MetadataDiff = {
  artistChanged: boolean
  releaseChanged: boolean
  genreChanged: boolean
  scalarChanged: boolean
  anyChanged: boolean
}

/**
 * Embedded keys that, if changed, require re-running artist creation.
 */
const ARTIST_KEYS = new Set([
  'embedded:artist',
  'embedded:albumartist',
  'embedded:albumartistsort',
  'fs-structure:artistName',
])

/**
 * Keys that, if changed, require re-running release creation.
 * Includes all artist keys because releases are namespaced by artist name.
 */
const RELEASE_KEYS = new Set([
  'embedded:album',
  'embedded:albumsort',
  'embedded:releasetype',
  'embedded:compilation',
  'embedded:albumartist',
  'embedded:albumartistsort',
  'embedded:artist',
  'fs-structure:releaseName',
  'fs-structure:artistName',
])

/**
 * Keys that, if changed, require re-running genre creation.
 */
const GENRE_KEYS = new Set([
  'embedded:genre',
])

/**
 * Keys that map to scalar columns on MusicTrack.
 */
const SCALAR_KEYS = new Set([
  'embedded:title',
  'embedded:track',
  'embedded:disk',
  'embedded:disc',
  'embedded:duration',
  'embedded:bitrate',
  'fs-structure:trackName',
  'fs-structure:trackNumber',
  'fs-structure:discNumber',
])

/**
 * Converts a MusicTrackMetadata array into a flat snapshot map.
 *
 * Each entry is keyed as `"<metadataFormat>:<metaKey>"` and maps to the
 * serialized string value (or null). This is the same representation used
 * by the database, so comparing two snapshots is a reliable change detection.
 */
export function buildMetadataSnapshot(rows: MusicTrackMetadata[]): MetadataSnapshot {
  const map: MetadataSnapshot = new Map()
  for (const row of rows) {
    map.set(`${row.metadataFormat}:${row.metaKey}`, row.metaValue ?? null)
  }
  return map
}

/**
 * Compares two metadata snapshots and returns which logical groups of derived
 * fields changed. Pass the old (DB) snapshot first and the new (freshly
 * extracted) snapshot second.
 */
export function diffMetadataSnapshots(
  oldSnapshot: MetadataSnapshot,
  newSnapshot: MetadataSnapshot,
): MetadataDiff {
  const allKeys = new Set([...oldSnapshot.keys(), ...newSnapshot.keys()])

  const changedKeys = new Set<string>()
  for (const key of allKeys) {
    if (oldSnapshot.get(key) !== newSnapshot.get(key)) {
      changedKeys.add(key)
    }
  }

  const artistChanged  = [...changedKeys].some((k) => ARTIST_KEYS.has(k))
  const releaseChanged = [...changedKeys].some((k) => RELEASE_KEYS.has(k))
  const genreChanged   = [...changedKeys].some((k) => GENRE_KEYS.has(k))
  const scalarChanged  = [...changedKeys].some((k) => SCALAR_KEYS.has(k))
  const anyChanged     = artistChanged || releaseChanged || genreChanged || scalarChanged

  return { artistChanged, releaseChanged, genreChanged, scalarChanged, anyChanged }
}
