import * as path from 'path'

/**
 * Parses the kiosk seed path format:
 *   /kiosk/artist-{n}/artist-{n}-release-{r}/artist-{n}-release-{r}-track-{t}.mp3
 *
 * Returns the segments needed by the three mock helpers below.
 */
export function parseKioskPath(absolutePath: string): { artistName: string, releaseName: string, trackName: string, trackNumber: number } {
  const parts = absolutePath.split(path.sep)
  const artistName  = parts[parts.length - 3] ?? 'Unknown Artist'
  const releaseName = parts[parts.length - 2] ?? 'Unknown Release'
  const fileName    = parts[parts.length - 1] ?? ''
  const baseName    = fileName.replace(/\.[^.]+$/, '')

  // A leading track number, e.g. "01 Allegro" → { 1, "Allegro" }. Used by the
  // believable demo seed so titles read cleanly and tracks sort correctly.
  const leadMatch = baseName.match(/^(\d{1,3})[\s._-]+(.+)$/)
  if (leadMatch) {
    return { artistName, releaseName, trackName: leadMatch[2], trackNumber: Number(leadMatch[1]) }
  }

  // Otherwise a trailing numeric segment, e.g. artist-1-release-1-track-7 → 7.
  const trailMatch = baseName.match(/-(\d+)$/)
  const trackNumber = trailMatch ? Number(trailMatch[1]) : 1

  return { artistName, releaseName, trackName: baseName, trackNumber }
}

// Deterministic 32-bit hash (djb2) so fabricated values survive reindexing unchanged
function hashKioskString(value: string): number {
  let hash = 5381
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) + hash + value.charCodeAt(i)) >>> 0
  }
  return hash
}

/*
 * Fabricates a stable release date for a kiosk release, spread up to 35 years into the
 * past so artist timelines and release sorting look organic. Hashing the artist+release
 * pair (never the track) keeps every track of an album on the same date, which the
 * artist summary's per-release year consensus requires.
 */
export function buildKioskReleaseDate(artistName: string, releaseName: string): { year: number, date: string } {
  const hash = hashKioskString(`${artistName}/${releaseName}`)
  const year = new Date().getFullYear() - (hash % 35)
  const month = ((hash >>> 8) % 12) + 1
  const day = ((hash >>> 16) % 28) + 1
  const pad = (n: number) => String(n).padStart(2, '0')
  return { year, date: `${year}-${pad(month)}-${pad(day)}` }
}

export function buildKioskEmbeddedMetadata(absolutePath: string): Record<string, unknown> {
  const { artistName, releaseName, trackName, trackNumber } = parseKioskPath(absolutePath)
  const { year, date } = buildKioskReleaseDate(artistName, releaseName)
  return {
    title:       trackName,
    artist:      artistName,
    albumartist: artistName,
    album:       releaseName,
    track:       { no: trackNumber, of: 10 },
    disk:        { no: 1, of: 1 },
    year:        year,
    date:        date,
    duration:    180 + (trackNumber * 7),
    bitrate:     320000,
    codec:       'MP3',
    sampleRate:  44100,
    numberOfChannels: 2,
  }
}

export function buildKioskFileStatMetadata(): { createdAt: string, modifiedAt: string } {
  return {
    createdAt:  new Date(0).toString(),
    modifiedAt: new Date(0).toString(),
  }
}

export function buildKioskFolderStructureMetadata(absolutePath: string): Record<string, string | number> {
  const { artistName, releaseName, trackName, trackNumber } = parseKioskPath(absolutePath)
  return {
    artistName,
    releaseName,
    trackName,
    trackNumber,
  }
}
