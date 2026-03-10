import * as fs from 'fs'
import * as path from 'path'
import { Logger } from '@nestjs/common'
import { MediaType, SupportedPhotoFileExtensions } from './media'
import { getMediaDirs } from './env'
import musicMetadata, { IAudioMetadata } from 'music-metadata'

export type FileMetadata = {
  createdAt: string | null,
  modifiedAt: string | null,
}

export type EmbeddedMetadataType =
  "string" |
  "number" |
  "bigint" |
  "boolean" |
  "symbol" |
  "undefined" |
  "object" |
  "function" |
  "array"

/**
 * This converts a full file path to one that's relative to its media directory.
 */
export const makeMediaFilePathRelative = (filePath: string): string => {
  const mediaDirs = getMediaDirs()
  let relativePath: string

  Object.values(mediaDirs).forEach((mediaDir) => {
    if (filePath.startsWith(mediaDir)) {
      relativePath = filePath.replace(mediaDir, '')
    }
  })

  if (!relativePath) throw new Error('The file path does not contain an active media directory')

  // Ensure leading slash
  if (!relativePath.startsWith(path.sep)) {
    relativePath = path.sep + relativePath
  }

  return relativePath
}

/**
 * This converts a relative file path to an absolute one.
 */
export const makeMediaFilePathAbsolute = (relativePath, mediaDir) => {
  return path.join(mediaDir, relativePath)
}

/**
 * Looks at the photo file in the file system and returns an object of values
 * that can be trusted.
 */
export const getTrustedValuesFromFileStats = (path): FileMetadata => {
  const trusted = {
    createdAt: null,
    modifiedAt: null,
  }

  try {
    const fileStats = fs.statSync(path)

    const createdTimes = [fileStats?.birthtime, fileStats?.birthtimeMs]
    const modifiedTimes = [fileStats?.mtime, fileStats?.mtimeMs]

    createdTimes.forEach((value: unknown) => {
      if (!trusted.createdAt && value && !isNaN(Date.parse(String(value)))) {
        trusted.createdAt = new Date(String(value)).toString()
      }
    })

    modifiedTimes.forEach((value: unknown) => {
      if (!trusted.modifiedAt && value && !isNaN(Date.parse(String(value)))) {
        trusted.modifiedAt = new Date(String(value)).toString()
      }
    })

    return trusted
  } catch (error) {
    Logger.error(`Could not read file ${path}`, 'Indexing')
    return trusted
  }
}

/**
 * Given a file path, a file name, or just an extension (with the dot), this
 * will return the corresponding media type.
 */
export const getMediaTypeFromFileExtension = (filePath: string): MediaType  => {
  const map = {
    [MediaType.PHOTOS]: [...Object.values(SupportedPhotoFileExtensions)],
  }

  for (const [type, extensions] of Object.entries(map)) {
    if (extensions.find((ext) => filePath.toLowerCase().includes(`.${ext}`))) {
      return type as MediaType
    }
  }
}

/**
 * Determines the metadataType column value.
 */
export const getMetadataType = (value): EmbeddedMetadataType => {
  if (ArrayBuffer.isView(value)) {
    return Object.prototype.toString.call(value)
  } else if (Array.isArray(value)) {
    return 'array'
  } else {
    return typeof value
  }
}

/**
 * Serializes the metadataValue column value.
 */
export const serializeMetadataValue = (value): string => {
  if (typeof value === 'string') {
    return value
  } else if (Array.isArray(value)) {
    return value.toString()
  } else if (typeof value === 'number') {
    return String(value)
  } else if (value === null) {
    return null
  } else if (typeof value === 'object') {
    try {
      const json = JSON.stringify(value)
      return json
    } catch (error) {
      return value
    }
  } else {
    return value
  }
}

/**
 * Reads the embedded music metadata for the given file.
 */
export async function readEmbeddedMusicMetadata(absolutePath: string): Promise<IAudioMetadata> {
  return await musicMetadata.parseFile(absolutePath)
}
