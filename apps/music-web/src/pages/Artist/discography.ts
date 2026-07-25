import type {
  MusicArtistReleaseListeningType,
  MusicArtistSummaryType,
} from '@cardinalapps/ui/src/store/apis/musicArtists'
import type { MusicReleaseType } from '@cardinalapps/ui/src/store/apis/musicReleases'
import type { MusicTrackType } from '@cardinalapps/ui/src/store/apis/musicTracks'

/**
 * One release of the artist's, with the release row, the summary's computed
 * figures and the user's listening record for it all pulled together. Every
 * part of the artist page reads from this rather than re-joining the payload.
 */
export type DiscographyEntry = {
  id: number,
  musicReleaseId: string,
  title: string,
  releaseType: string | null,
  year: number | null,
  numTracks: number,
  runtimeSeconds: number,
  bytes: number,
  /** Every file extension on the release, most common first. */
  extensions: string[],
  lossless: boolean,
  hasArtwork: boolean,
  tracks: MusicTrackType[],
  listening?: MusicArtistReleaseListeningType,
}

// Mirrors the Media Server's list, which is what decides the summary's lossless figures
const LOSSLESS_EXTENSIONS = ['flac', 'alac', 'wav', 'aiff', 'aif', 'ape', 'wv']

export const isLosslessExtension = (extension: string): boolean => (
  LOSSLESS_EXTENSIONS.includes(extension.trim().toLowerCase())
)

// Album order: disc first, then track number
const inAlbumOrder = (tracks: MusicTrackType[]): MusicTrackType[] => (
  [...tracks].sort((a, b) => (
    (Number(a?.discNumber) || 1) - (Number(b?.discNumber) || 1)
    || (Number(a?.trackNumber) || 0) - (Number(b?.trackNumber) || 0)
  ))
)

/**
 * Builds the artist's discography newest release first.
 *
 * Releases with no tagged year sort to the end: a missing year says nothing
 * about when something came out, so guessing at a position would be worse than
 * parking it.
 */
export const buildDiscography = (
  releases: MusicReleaseType[],
  summary?: MusicArtistSummaryType,
): DiscographyEntry[] => {
  const figures = new Map((summary?.releases ?? []).map((release) => [release.musicReleaseId, release]))
  const listening = new Map((summary?.listening?.releases ?? []).map((release) => [release.musicReleaseId, release]))

  return releases
    .map((release) => {
      const musicReleaseId = String(release.musicReleaseId ?? '')
      const figure = figures.get(musicReleaseId)
      const tracks = inAlbumOrder((release.tracks ?? []) as MusicTrackType[])

      return {
        id: release.id,
        musicReleaseId,
        title: String(release.title ?? ''),
        releaseType: (release.releaseType as string) ?? null,
        year: figure?.year ?? null,
        numTracks: figure?.numTracks ?? tracks.length,
        runtimeSeconds: figure?.runtimeSeconds ?? tracks.reduce((sum, track) => sum + (Number(track.duration) || 0), 0),
        bytes: figure?.bytes ?? 0,
        extensions: figure?.extensions ?? [],
        lossless: figure?.lossless ?? false,
        hasArtwork: !!release.thumbnails?.length,
        tracks,
        listening: listening.get(musicReleaseId),
      }
    })
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || a.title.localeCompare(b.title))
}

// Every playable track id across the given releases, in release then album order
export const discographyTrackIds = (entries: DiscographyEntry[]): string[] => (
  entries.flatMap((entry) => entry.tracks.map((track) => track.musicTrackId).filter(Boolean))
)

/**
 * The artist's tracks as one flat list, for the modes that don't care which
 * release a track came from.
 */
export const discographyTracks = (entries: DiscographyEntry[]): MusicTrackType[] => (
  entries.flatMap((entry) => entry.tracks)
)
