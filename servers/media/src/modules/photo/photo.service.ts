import * as fs from 'fs'
import * as path from 'path'
import * as worker_threads from 'worker_threads'
import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { QueryRunner, Repository } from 'typeorm'
import { v4 as uuid } from 'uuid'
import exifr from 'exifr'
import { globStream } from 'glob'
import { UAParser } from 'ua-parser-js'

import { Photo } from './photo.entity'
import { PhotoVariation } from './photo-variation.entity'
import { PhotoThumbnail } from './photo-thumbnail.entity'
import { PhotoMetadata } from './photo-metadata.entity'

import { File } from '../indexing/entities/file.entity'
import { EventService } from '../event/event.service'
import { PhotoAlbumService } from '../photo-album/photo-album.service'
import { PhotoAlbumEntry } from '../photo-album/photo-album-entry.entity'
import { PhotoAlbumEntryService } from '../photo-album/photo-album-entry.service'

import { GetPhotosDto } from './dtos/GetPhotos.dto'

import { envVar } from '../../utils/env'
import { helpCode } from '../../utils/help-codes'
import { happensInXSeconds } from '../../utils/time'
import { log, LogModule, LogLevel } from '../../utils/logging'

import { HeicToJpgWorkerInput } from './types'

/**
 * Row IDs are a 32 bit signed integer column, so an all-digits identifier that
 * overflows it cannot be one. Postgres throws on an out of range comparison
 * where SQLite simply matches nothing, so these are treated as photo IDs and
 * fall through to a 404.
 */
const MAX_ROW_ID = 2147483647

/**
 * Matches the directory that Google Takeout exports into, for example
 * `/takeout-20240115T143022Z-001/`. Group 1 is the export date, group 2 the
 * export time (UTC, per the `z`), and group 3 the batch number.
 */
const GOOGLE_TAKEOUT_DIR = /\/takeout-(\d+)t(\d+)z-(\d+)\//i

/**
 * Matches the Google Photos filename format `{photo_type}_yyyymmdd_hhmmss`,
 * e.g. `IMG_20240115_143022.jpg`. Both `_` and `-` show up as the separator
 * before the time in the wild, and Pixel exports append milliseconds to it.
 */
const GOOGLE_PHOTOS_FILENAME_DATE = /(?:^|\D)(\d{8})[_-](\d{6})/

/**
 * Matches a plain `yyyy-mm-dd` date in a filename, e.g. `2024-01-01.jpg` or
 * `2024-03-10-gps.jpg`.
 */
const PLAIN_FILENAME_DATE = /(?:^|\D)(\d{4})-(\d{2})-(\d{2})(?:\D|$)/

/**
 * Builds a local date from digit strings pulled out of a file path. Returns
 * null unless the parts describe a real calendar date, so that arbitrary digits
 * in a filename are not mistaken for one.
 */
function dateFromParts(year: number, month: number, day: number, hours = 0, minutes = 0, seconds = 0): Date | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null
  }

  if (hours > 23 || minutes > 59 || seconds > 59) {
    return null
  }

  const date = new Date(year, month - 1, day, hours, minutes, seconds, 0)

  // Rejects days that don't exist in the month, like February 31st. The time is
  // deliberately not round-tripped, because a valid local time legitimately
  // shifts when it lands in a daylight saving gap.
  const isRealDate = date.getFullYear() === year
    && date.getMonth() === month - 1
    && date.getDate() === day

  return isRealDate ? date : null
}

/**
 * Formats a date as `YYYY-MM-DDTHH:mm:ss`, which reads as local time because it
 * carries no timezone designator. A date parsed out of a file name has no zone
 * to begin with, so emitting one would invent information the name never had.
 */
function toLocalDateTimeString(date: Date): string {
  const pad = (value: number, length = 2) => String(value).padStart(length, '0')

  return [
    `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`,
  ].join('T')
}

@Injectable()
export class PhotoService {
  constructor(
    @InjectRepository(File)
    private fileRepository: Repository<File>,
    @InjectRepository(Photo)
    private photoRepository: Repository<Photo>,
    @InjectRepository(PhotoMetadata)
    private photoMetadataRepository: Repository<PhotoMetadata>,
    @InjectRepository(PhotoThumbnail)
    private photoThumbnailRepository: Repository<PhotoThumbnail>,
    @InjectRepository(PhotoVariation)
    private photoVariationRepository: Repository<PhotoVariation>,
    private readonly photoAlbumService: PhotoAlbumService,
    private readonly photoAlbumEntryService: PhotoAlbumEntryService,
    private readonly eventService: EventService,
  ) {}

  /**
   * Creates a new photo entity in the database.
   */
  async createPhoto(file: File, queryRunner?: QueryRunner): Promise<Photo> {
    const initialPhoto = {
      photoId: uuid(),
      file,
    } as Partial<Photo>

    let photo

    if (queryRunner) {
      photo = await queryRunner.manager.save(Photo, initialPhoto)
      await queryRunner.manager.save(File, {
        id: file.id,
        photo: {
          id: photo.id,
        },
      })
    } else {
      photo = await this.photoRepository.save(initialPhoto)
      await this.fileRepository.save({
        id: file.id,
        photo: {
          id: photo.id,
        },
      })
    }

    return photo
  }

  /**
   * Creates new photo variation entities in the database.
   */
  async createPhotoVariations(variations: Partial<PhotoVariation>[], queryRunner?: QueryRunner): Promise<PhotoVariation[]> {
    if (queryRunner) {
      return await queryRunner.manager.save(PhotoVariation, variations)
    } else {
      return await this.photoVariationRepository.save(variations)
    }
  }

  /**
   * Creates new photo thumbnail entities in the database.
   */
  async createPhotoThumbnails(thumbnails: Partial<PhotoThumbnail>[], queryRunner?: QueryRunner): Promise<PhotoThumbnail[]> {
    if (queryRunner) {
      return await queryRunner.manager.save(PhotoThumbnail, thumbnails)
    } else {
      return await this.photoThumbnailRepository.save(thumbnails)
    }
  }

  /**
   * Reads the Exif data that's embedded in the photo file on the disk and
   * returns it. It will be an object with zero or more key/value pairs, where
   * values may be undefined.
   */
  async getExifFromFile(absolutePath: string): Promise<Record<string, unknown>[] | false> {
    try {
      const exifData = await exifr.parse(absolutePath, true)
      return exifData
    } catch (error) {
      Logger.error(`Could not read Exif data for file: ${absolutePath}`, 'Indexing')
    }

    return false
  }

  /**
   * Tries to determine if the file is one that was exported from Google Photos
   * using Google Takeout. This depends on the folder structure provided by
   * Google Takeout, so if a photo was originally from Google Photos but was
   * moved to a new location, there is no way to know anymore since Google does
   * not tag any metadata (that I know of).
   */
  isFromGooglePhotos(absolutePath: string) {
    return absolutePath.includes('/takeout-') || absolutePath.includes('GooglePhotos')
  }

  /**
   * Returns the path to the parent Google Takeout directory of a Google Photo.
   */
  getGoogleTakeoutRootFromPath(absolutePath: string): string | null {
    const takeoutPart = this.getGoogleTakeoutFromPath(absolutePath)

    if (!takeoutPart) {
      return null
    }

    const split = absolutePath.split(takeoutPart)

    return path.join(split[0], takeoutPart)
  }

  /**
   * Returns the Google Takeout directory segment of the file path, if it has
   * one. Plenty of Google Photos files live outside a takeout directory (the
   * path only has to mention GooglePhotos to be treated as one), so callers
   * have to handle the null.
   */
  getGoogleTakeoutFromPath(absolutePath: string): string | null {
    const takeoutDateTimeMatch = absolutePath.match(GOOGLE_TAKEOUT_DIR)

    if (!takeoutDateTimeMatch) {
      return null
    }

    return takeoutDateTimeMatch[0]
  }

  /**
   * Google Takeout puts all photos from each year into folders called "Photos
   * from xxxx". This returns the year from the file path if it matches the
   * pattern.
   */
  getGooglePhotosArchiveYearFromPath(absolutePath: string) {
    const yearMatch = absolutePath.match(/\/Photos from (\d+)\//mi)

    if (Array.isArray(yearMatch) && yearMatch.length) {
      return yearMatch[1]
    }

    return null
  }

  /**
   * Looks for the Google Takeout datetime in the file path. This would be the
   * time that the user triggered the Google Takeout export. The directory name
   * spells it out in UTC, so the returned string is an ISO 8601 timestamp.
   */
  getGoogleTakeoutDateTimeFromPath(absolutePath: string): string | null {
    const takeoutDateTimeMatch = absolutePath.match(GOOGLE_TAKEOUT_DIR)

    if (!takeoutDateTimeMatch) {
      return null
    }

    const [, yyyymmdd, hhmmss] = takeoutDateTimeMatch

    if (yyyymmdd.length !== 8 || hhmmss.length !== 6) {
      return null
    }

    const exportedAt = Date.UTC(
      Number(yyyymmdd.slice(0, 4)),
      Number(yyyymmdd.slice(4, 6)) - 1,
      Number(yyyymmdd.slice(6, 8)),
      Number(hhmmss.slice(0, 2)),
      Number(hhmmss.slice(2, 4)),
      Number(hhmmss.slice(4, 6)),
    )

    return isNaN(exportedAt) ? null : new Date(exportedAt).toISOString()
  }

  /**
   * Google Takeout batches the photos into directories that have the pattern:
   * 
   *  [...]/takeout-{datetime}-{batch}/[...]/photo.jpg
   * 
   * This returns the batch if it's in the path.
   */
  getGoogleTakeoutBatchFromPath(absolutePath: string): string | null {
    const takeout = this.getGoogleTakeoutFromPath(absolutePath)

    if (!takeout) {
      return null
    }

    const takeoutDateTimeParts = takeout.split('-')

    if (takeoutDateTimeParts.length !== 3) {
      return null
    }

    return takeoutDateTimeParts.pop().replace('/', '')
  }

  /**
   * Looks for a Google Photos JSON file that is created by Google Takeout when
   * a user exports their photos.
   * 
   * The JSON file has the same name as the photo file, however there seem to be
   * numerous exceptions, like sometimes the photo file has some extra
   * characters at the end, or the JSON file has an extra characters at the end,
   * or sometimes it's in a completely different directory.
   */
  async getGooglePhotosMetadata(absolutePath: string): Promise<Record<string, unknown> | null> {
    if (!this.isFromGooglePhotos(absolutePath)) {
      return null
    }

    const trailingPhotoFileCharactersToTrim = ['_', '_o', '_n']
    const extraJSONFileCharactersToAdd = ['_', '_o', '_n', '_n.']

    // Determine the root photo file name without extra characters
    const pathParts = absolutePath.split(path.sep)
    const fileName = pathParts[pathParts.length - 1]
    const fileNameWithoutExtension = fileName.split('.')[0]
    const [fileNameWithoutTrailingCharacters = fileName] = trailingPhotoFileCharactersToTrim
      .map((extra) => {
        if (fileNameWithoutExtension.endsWith(extra)) {
          return fileNameWithoutExtension.substring(0, fileNameWithoutExtension.length - extra.length)
        } else {
          return null
        }
      })
      .filter((item) => !!item)

    // Determine potential JSON file names for the photo name
    const defaultGooglePhotosJSONFileParts = [...pathParts]
    defaultGooglePhotosJSONFileParts.pop()
    defaultGooglePhotosJSONFileParts.push(`${fileNameWithoutTrailingCharacters}.json`)
    const defualtGooglePhotosJSONFilePath = defaultGooglePhotosJSONFileParts.join(path.sep)
    const JSONFilesToLookFor = [defualtGooglePhotosJSONFilePath]
    extraJSONFileCharactersToAdd.forEach((extra) => {
      JSONFilesToLookFor.push(defualtGooglePhotosJSONFilePath.replace('.json', `${extra}.json`))
    })

    // Helper that checks for a potential JSON file, and reads the contents
    const getJSONFileContents = (fileName): Record<string, unknown> | null => {
      if (fs.existsSync(fileName)) {
        try {
          const fileContents = fs.readFileSync(fileName, 'utf8')
          return JSON.parse(fileContents)
        } catch (error) {
          Logger.error(`Found a Google Photos JSON file but the format was invalid: ${fileName}`, 'Indexing')
          return null
        }
      }
    }

    let foundJSON = null

    JSONFilesToLookFor.forEach((fileName) => {
      if (!foundJSON) {
        foundJSON = getJSONFileContents(fileName)
      }
    })

    // I came across a case in my own personal media where the JSON file was in
    // a completely different directory. The structure was:
    //
    // [...]/takeout-{datetime}-001/[...]/photoname.jpg.json   <-- this was the JSON metadata
    // [...]/takeout-{datetime}-002/[...]/photoname.jpg        <-- this was the original photo
    //
    // So, it was the expected file name pattern, but in a directory with one
    // increment higher (and same datetime). Since only 2 out of my 5000 photos
    // had this issue, it's an edge case.
    //
    // In my case, it was a matter of 001 vs 002, but there is no way to know
    // how it will play out for other users. Let's assume that Google always
    // starts with a 001 directory, and check upwards from there until we find a
    // JSON file or we hit a reasonable max.
    if (!foundJSON) {
      const takeout = this.getGoogleTakeoutFromPath(absolutePath)
      const batch = this.getGoogleTakeoutBatchFromPath(absolutePath)
      if (batch) {
        const max = 10

        // Assume that Google would not skip an increment, so if we don't find
        // the next one up, we'll stop looking altogether
        for (let i = 1; i <= max; i++) {
          if (!foundJSON) {
            const nextBatchPathParts = takeout.split('-')
            nextBatchPathParts[2] = i.toString().padStart(3, '0') + '/'
            const pathToCheck = absolutePath.replace(takeout, nextBatchPathParts.join('-')) + '.json'
            foundJSON = getJSONFileContents(pathToCheck)
          }
        }
      }
    }

    return foundJSON || null
  }

  /**
   * Looks for photo albums in the files on the disk exported by Google Takeout
   * and returns an array of all the photo album folder paths.
   * 
   * Note: in my own personal media, 1 of 20 photo albums didn't contain the
   * metadata.json file, and I don't know why. So I suppose there is a small
   * margin of error with this function.
   */
  readGooglePhotosAlbumsOnDisk(photosDir: string): Promise<string[]> {
    // FIXME
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve) => {
      const foundMetadataFiles = []
      const timeoutSeconds = envVar('INDEXING_SCAN_TIMEOUT', 120)
      const abortController = new AbortController()
      const cancelGooglePhotosTimeout = happensInXSeconds(timeoutSeconds, () => {
        Logger.error(`Timed out when scanning for photo albums from Google Photos. ${helpCode('0100')}`)
        abortController.abort()
        resolve([])
      })

      log(LogModule.INDEXING, LogLevel.DEBUG, `Starting scan for photo albums from Google Photos with a ${timeoutSeconds} second timeout`)

      try {
        const glob = globStream(`${photosDir}/**/GooglePhotos/**/metadata.json`, {
          stat: true,
          withFileTypes: true,
          nocase: true,
          follow: false,
          signal: abortController.signal,
        })

        for await (const found of glob) {
          // Cancel the timeout when we find the first file
          cancelGooglePhotosTimeout()

          const file = found.fullpath()
          foundMetadataFiles.push(file)
        }
      } catch (error) {
        Logger.error(error, 'Indexing')
      }

      const foundGooglePhotosAlbums = foundMetadataFiles.map((path) => path.replace('/metadata.json', ''))

      resolve(foundGooglePhotosAlbums)
    })
  }

  /**
   * Returns all photos in order from newest to oldest.
   */
  async getPhotos(getPhotosDto: GetPhotosDto): Promise<[Photo[], number]> {
    const { take, skip, order, orderBy, thumbnails, metadata, photoAlbumEntries } = getPhotosDto
    return await this.photoRepository.findAndCount({
      take,
      skip,
      relations: {
        thumbnail: thumbnails,
        metadata: metadata,
        photoAlbumEntries: photoAlbumEntries ? { photoAlbum: true } : false,
      },
      order: {
        [orderBy]: order,
      },
    })
  }

  /**
   * Returns the total number of indexed photos.
   */
  async countPhotos(): Promise<number> {
    const result = await this.photoRepository.findAndCount({
      take: 1,
      skip: 0,
    })

    return result?.[1] || 0
  }

  /**
   * Gets a single photo by either of its identifiers: the numeric row ID
   * (given as a number, or as the all-digits string that arrives in a URL
   * param) or the UUID photo ID.
   */
  async getPhoto(id: number | string, relations: Record<string, boolean | Record<string, unknown>> = {}): Promise<Photo | null> {
    const isRowId = typeof id === 'number'
      ? Number.isInteger(id) && id <= MAX_ROW_ID
      : /^\d+$/.test(id) && Number(id) <= MAX_ROW_ID

    const where = isRowId
      ? { id: Number(id) }
      : { photoId: String(id) }

    const photo = await this.photoRepository.find({
      where,
      relations: {
        file: relations?.file || false,
        metadata: relations?.metadata || false,
        variations: relations?.variations || false,
        thumbnail: relations?.thumbnail || false,
        photoAlbumEntries: relations?.photoAlbumEntries || false,
      },
    })

    if (!photo.length) {
      return null
    }

    return photo[0]
  }

  /**
   * Parses the file path to try and find a date among the many ways it may be
   * stored in a file path.
   */
  getDateFromFilePath = (absolutePath: string): string | null => {
    const pathParts = absolutePath.split(path.sep)
    const fileName = pathParts[pathParts.length - 1]

    if (!fileName) return null

    // Look for Google Photos format: {photo_type}_yyyymmdd_hhmmss.{extension}
    //
    // Where {photo_type} is (screenshot|img|vid|pano) but I didn't want to
    // limit to just those types in case there's others that I don't know of, so
    // any word is supported.
    //
    // Note: when manually cross-checking the date in the file name with the
    // exported Google Photos JSON, it appears that the file name uses the
    // timezone where the photo was taken, not UTC time. This function has no
    // knowledge outside of the filename, which does not contain a timezone, so
    // we have to assume that the machine doing the indexing is in the same
    // timezone that the photo was taken.
    //
    // This means that travel photos that are relying solely on the file name
    // for date recognition will have the incorrect time/day. This seems like an
    // edge case, but I came across it in my own personal photos, so it may be
    // more common than it seems.
    const googlePhotosDateFormat = fileName.match(GOOGLE_PHOTOS_FILENAME_DATE)
    if (googlePhotosDateFormat) {
      const [, yyyymmdd, hhmmss] = googlePhotosDateFormat
      const googlePhotosDate = dateFromParts(
        Number(yyyymmdd.slice(0, 4)),
        Number(yyyymmdd.slice(4, 6)),
        Number(yyyymmdd.slice(6, 8)),
        Number(hhmmss.slice(0, 2)),
        Number(hhmmss.slice(2, 4)),
        Number(hhmmss.slice(4, 6)),
      )

      if (googlePhotosDate) {
        return toLocalDateTimeString(googlePhotosDate)
      }
    }

    // Fall back to a plain yyyy-mm-dd filename, which is how plenty of people
    // name photos that carry no Exif date at all. The same timezone caveat as
    // above applies, and there is no time of day to go with it, so the photo
    // lands at local midnight on that day.
    const plainDateFormat = fileName.match(PLAIN_FILENAME_DATE)
    if (plainDateFormat) {
      const [, year, month, day] = plainDateFormat
      const plainDate = dateFromParts(Number(year), Number(month), Number(day))

      if (plainDate) {
        return toLocalDateTimeString(plainDate)
      }
    }

    return null
  }

  /**
   * Returns whether the client device has support for HEIC/HEIF.
   */
  clientDeviceSupportsHEIF(userAgent): boolean {
    if (!userAgent) {
      return false
    }

    const ua = new UAParser(userAgent)
    const results = ua.getResult()

    // Allow Safari >=17.0
    if (results.browser.name === 'Safari' && results.browser.major === '17') {
      return true
    }

    return false
  }

  /**
   * Converts a HEIF/HEIC image to a JPEG in a worker thread.
   */
  heifToJpeg(absoluteFilePath: string) {
    return new Promise((heicResolve) => {
      const worker = new worker_threads.Worker(
        path.join(__dirname, 'workers', 'heic-to-jpg'),
        { workerData: { absoluteFilePath } as HeicToJpgWorkerInput },
      )
      worker.on('message', (data) => {
        heicResolve(data)
      })
      worker.on('error', (error) => {
        Logger.error(error)
        heicResolve(null)
      })
      worker.on('exit', () => {
        heicResolve(null)
      })
    })
  }

  /**
   * Sets the Photo's albums to match exactly the array; so, the photo will be
   * removed from all albums not present in the array, and added to any new
   * albums in the array.
   */
  async setPhotoAlbums(id: number | string, photoAlbumIds: number[]): Promise<Photo> {
    const photo = await this.getPhoto(id, { photoAlbumEntries: { photoAlbum: true } })

    if (!photo) {
      throw new Error('Invalid photo ID')
    }

    const photoAlbumEntries: PhotoAlbumEntry[] = photo.photoAlbumEntries
    const currentPhotoAlbumIds = photoAlbumEntries.map((entry) => entry.photoAlbum.id)

    const photoAlbumsToAddTo = photoAlbumIds.filter((id) => !currentPhotoAlbumIds.includes(id))
    if (photoAlbumsToAddTo.length) {
      await this.photoAlbumService.addPhotoToAlbums(photo, photoAlbumsToAddTo)
    }

    const photoAlbumsToRemoveFrom = currentPhotoAlbumIds.filter((id) => !photoAlbumIds.includes(id))
    if (photoAlbumsToRemoveFrom.length) {
      await this.photoAlbumService.removePhotoFromAlbums(photo, photoAlbumsToRemoveFrom)
    }

    return await this.getPhoto(photo.id)
  }
}
