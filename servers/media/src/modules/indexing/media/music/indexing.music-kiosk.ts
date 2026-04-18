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
  const trackName   = fileName.replace(/\.mp3$/, '')

  // track number is the final numeric segment, e.g. artist-1-release-1-track-7 → 7
  const trackNumMatch = trackName.match(/-(\d+)$/)
  const trackNumber   = trackNumMatch ? Number(trackNumMatch[1]) : 1

  return { artistName, releaseName, trackName, trackNumber }
}

export function buildKioskEmbeddedMetadata(absolutePath: string): Record<string, unknown> {
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
