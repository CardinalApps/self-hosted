import * as path from 'path'

import { MusicFileSystemStructureMetadata } from '../../types'

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
export const MATCH_NUMBER_PREFIX = /^(\[?|\(?)\d+(\]?|\)?)\s?( |-)\s?/i

/**
 * Search the start of the string for a track and optional disc number.
 *
 * Examples:
 *
 *   9 Psychopomp.mp3
 *   (09)-Psychopomp.mp3
 *   1-04 - The Great Debate.flac
 */
export const MATCH_TRACK_AND_DISC_PREFIX = /^[[|()]?([0-9]+)[-_]?([0-9]*)/

/**
 * Many music file names start with something like this to indicate track and
 * disc numbers:
 *
 *   1 - song.mp3
 *   01 - song.mp3
 *   1-1 - song.mp3
 *   02-4 - song.mp3
 *
 * This function takes a file name and returns the parsed track and disc number.
 */
export function getTrackAndDiscNumberFromFileName(fileName: string): { track: number | null, disc: number | null } {
  const result = { track: null, disc: null }
  const trackAndDiscMatch = MATCH_TRACK_AND_DISC_PREFIX.exec(fileName)

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
 * Looks for the disc number in the folder structure.
 */
export function findDiscNumberInFolderStructure(filePath: string): number | null {
  const potentialDiscPart = filePath.split(path.sep).slice(-2, -1)[0]

  const matchDisc = /disc[ -]?\d+/gi
  const matchCd = /cd[ -]?\d+/gi

  // look for "disc" or "cd" with an optional space or dash, and then any number
  if (!(matchDisc.exec(potentialDiscPart)) && !(matchCd.exec(potentialDiscPart))) {
    return null
  }

  const matchNumbers = /\d+/g
  const matchedNumbers = matchNumbers.exec(potentialDiscPart)

  if (matchedNumbers.length) {
    return Number(matchedNumbers[0])
  }

  const fileName = filePath.split(path.sep).pop()
  const trackAndDisc = getTrackAndDiscNumberFromFileName(fileName)

  if (trackAndDisc.disc) {
    return trackAndDisc.disc
  }

  return null
}

/**
 * Looks for the artist name in the folder structure.
 */
export function findArtistNameInFolderStructure(filePath: string): string | null {
  const hasDiscFolder = findDiscNumberInFolderStructure(filePath)
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
export function findReleaseYearInFolderStructure(filePath: string): number | null {
  const hasDiscFolder = findDiscNumberInFolderStructure(filePath)
  const releaseNamePart = hasDiscFolder
    ? filePath.split(path.sep).slice(-3, -2)[0]
    : filePath.split(path.sep).slice(-2, -1)[0]

  if (!releaseNamePart) {
    return null
  }

  const matched = MATCH_NUMBER_PREFIX.exec(releaseNamePart)
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
export function findReleaseNameInFolderStructure(filePath: string): string | null {
  const hasDiscFolder = findDiscNumberInFolderStructure(filePath)
  const releaseNamePart = hasDiscFolder
    ? filePath.split(path.sep).slice(-3, -2)[0]
    : filePath.split(path.sep).slice(-2, -1)[0]

  if (!releaseNamePart) {
    return null
  }

  const releaseYear = MATCH_NUMBER_PREFIX.exec(releaseNamePart)

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
export function findTrackNumberInFolderStructure(filePath: string): number | null {
  const fileName = filePath.split(path.sep).pop()
  const withoutExtension = fileName.split('.')?.[0]

  if (!withoutExtension) {
    return null
  }

  const trackAndDisc = getTrackAndDiscNumberFromFileName(fileName)

  return trackAndDisc.track
}

/**
 * Looks for the track name in the folder structure.
 */
export function findTrackNameInFolderStructure(filePath: string): string | null {
  const fileName = filePath.split(path.sep).pop()
  const withoutExtension = fileName.split('.')?.[0]

  if (!withoutExtension) {
    return null
  }

  const trackNumber = MATCH_NUMBER_PREFIX.exec(withoutExtension)

  if (trackNumber) {
    return withoutExtension.replace(trackNumber[0], '')
  }

  return withoutExtension
}

/**
 * Given a file path, this will try and figure out metadata based on the
 * folder and file structure.
 */
export function findFolderStructureMetadata(absoluteFilePath: string): MusicFileSystemStructureMetadata {
  const trackNumber = findTrackNumberInFolderStructure(absoluteFilePath)
  const trackName = findTrackNameInFolderStructure(absoluteFilePath)
  const releaseName = findReleaseNameInFolderStructure(absoluteFilePath)
  const releaseYear = findReleaseYearInFolderStructure(absoluteFilePath)
  const artistName = findArtistNameInFolderStructure(absoluteFilePath)
  const discNumber = findDiscNumberInFolderStructure(absoluteFilePath)
  return {
    ...(trackName && { trackName }),
    ...(trackNumber && { trackNumber }),
    ...(releaseName && { releaseName }),
    ...(releaseYear && { releaseYear }),
    ...(artistName && { artistName }),
    ...(discNumber && { discNumber }),
  }
}
