import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm'
import { Repository, DataSource, QueryRunner } from 'typeorm'
import { File } from '../entities/file.entity'
import { Photo } from '../../photo/photo.entity'
import { PhotoService } from '../../photo/photo.service'
import { PhotoMetadata } from '../../photo/photo-metadata.entity'

import { EventService } from '../../event/event.service'
import { IndexingEvents } from '../events'

import {
  FileMetadata,
  getTrustedValuesFromFileStats,
  getMetadataType,
  serializeMetadataValue,
} from '../../../utils/file'
import { getDateFromGPSFormat } from '../../../utils/gps'
import { flattenObject } from '../../../utils/object'
import { sanitizeDateString } from '../../../utils/date'
import { log, LogModule, LogLevel } from '../../../utils/logging'

/**
 * Handles everything needed to index a photo, from Exif data to thumbnails.
 */
@Injectable()
export class PhotoIndexingService {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
    @InjectRepository(Photo)
    private photoRepository: Repository<Photo>,
    @InjectRepository(PhotoMetadata)
    private photoMetadataRepository: Repository<PhotoMetadata>,
    @InjectRepository(File)
    private fileRepository: Repository<File>,
    private readonly photoService: PhotoService,
    private readonly eventService: EventService,
  ) {}

  /**
   * Updates the entities for a photo that was previously indexed.
   *
   * Preserves the existing Photo ID (and therefore all PhotoAlbumEntry rows
   * attached to it). Replaces all PhotoMetadata rows, then updates the scalar
   * columns on the existing photo.
   */
  async updatePhotoEntities(file: File, existingPhoto: Photo, queryRunner?: QueryRunner): Promise<Photo> {
    await queryRunner.manager.delete(PhotoMetadata, { photo: { id: existingPhoto.id } })

    const trustedPhotoFileValues = getTrustedValuesFromFileStats(file.absolutePath)
    const photoMetadataEntities = await this.createExifMetadata(file, existingPhoto, queryRunner)
    const googlePhotosMetadata = await this.createGooglePhotosMetadata(file, existingPhoto, queryRunner)

    await queryRunner.manager.save(Photo, {
      id: existingPhoto.id,
      takenAt: this.createTrustedValueFromMetadata('takenAt', file.absolutePath, photoMetadataEntities, trustedPhotoFileValues, googlePhotosMetadata),
      modifiedAt: this.createTrustedValueFromMetadata('modifiedAt', file.absolutePath, photoMetadataEntities, trustedPhotoFileValues, googlePhotosMetadata),
      takenOnDay: this.createTrustedValueFromMetadata('takenOnDay', file.absolutePath, photoMetadataEntities, trustedPhotoFileValues, googlePhotosMetadata) as string,
      timestamp: this.createTrustedValueFromMetadata('timestamp', file.absolutePath, photoMetadataEntities, trustedPhotoFileValues, googlePhotosMetadata) as number,
      width: this.createTrustedValueFromMetadata('width', file.absolutePath, photoMetadataEntities, trustedPhotoFileValues, googlePhotosMetadata) as number,
      height: this.createTrustedValueFromMetadata('height', file.absolutePath, photoMetadataEntities, trustedPhotoFileValues, googlePhotosMetadata) as number,
      orientation: this.createTrustedValueFromMetadata('orientation', file.absolutePath, photoMetadataEntities, trustedPhotoFileValues, googlePhotosMetadata) as string,
      deviceMake: this.createTrustedValueFromMetadata('deviceMake', file.absolutePath, photoMetadataEntities, trustedPhotoFileValues, googlePhotosMetadata) as string,
      deviceModel: this.createTrustedValueFromMetadata('deviceModel', file.absolutePath, photoMetadataEntities, trustedPhotoFileValues, googlePhotosMetadata) as string,
      gpsLat: this.createTrustedValueFromMetadata('gpsLat', file.absolutePath, photoMetadataEntities, trustedPhotoFileValues, googlePhotosMetadata) as number,
      gpsLng: this.createTrustedValueFromMetadata('gpsLng', file.absolutePath, photoMetadataEntities, trustedPhotoFileValues, googlePhotosMetadata) as number,
      gpsLatRef: this.createTrustedValueFromMetadata('gpsLatRef', file.absolutePath, photoMetadataEntities, trustedPhotoFileValues, googlePhotosMetadata) as string,
      gpsLngRef: this.createTrustedValueFromMetadata('gpsLngRef', file.absolutePath, photoMetadataEntities, trustedPhotoFileValues, googlePhotosMetadata) as string,
      gpsAltitude: this.createTrustedValueFromMetadata('gpsAltitude', file.absolutePath, photoMetadataEntities, trustedPhotoFileValues, googlePhotosMetadata) as string,
      gpsDate: this.createTrustedValueFromMetadata('gpsDate', file.absolutePath, photoMetadataEntities, trustedPhotoFileValues, googlePhotosMetadata) as string,
      gpsTime: this.createTrustedValueFromMetadata('gpsTime', file.absolutePath, photoMetadataEntities, trustedPhotoFileValues, googlePhotosMetadata) as string,
    })

    const photo = await this.photoRepository.findOne({
      where: {
        photoId: existingPhoto.photoId,
      },
      relations: {
        thumbnail: true,
      },
    })

    this.eventService.emitPrivate(IndexingEvents.PHOTO_UPDATED, photo as unknown as Record<string, unknown>)

    return photo
  }

  /**
   * Indexes a photo.
   *
   * This will read a photo file on the disk, create database entities, and
   * create thumbnails of the photo.
   */
  async indexPhotoEntities(file: File, queryRunner?: QueryRunner): Promise<Photo> {
    const trustedPhotoFileValues = getTrustedValuesFromFileStats(file.absolutePath)
    const initialPhotoEntity = await this.photoService.createPhoto(file, queryRunner)
    const photoMetadataEntities = await this.createExifMetadata(file, initialPhotoEntity, queryRunner)
    const googlePhotosMetadata = await this.createGooglePhotosMetadata(file, initialPhotoEntity, queryRunner)

    // TODO this was replaced with a the photo_thumbnails job, finish cleaning this out of this module
    //const thumbnailEntities = await this.createAndIndexThumbnails(file, initialPhotoEntity, photoMetadataEntities, queryRunner)

    // Update the photo table with trusted data from metadata
    await queryRunner.manager.save(Photo, {
      id: initialPhotoEntity.id,
      takenAt: this.createTrustedValueFromMetadata('takenAt', file.absolutePath, photoMetadataEntities, trustedPhotoFileValues, googlePhotosMetadata),
      modifiedAt: this.createTrustedValueFromMetadata('modifiedAt', file.absolutePath, photoMetadataEntities, trustedPhotoFileValues, googlePhotosMetadata),
      takenOnDay: this.createTrustedValueFromMetadata('takenOnDay', file.absolutePath, photoMetadataEntities, trustedPhotoFileValues, googlePhotosMetadata) as string,
      timestamp: this.createTrustedValueFromMetadata('timestamp', file.absolutePath, photoMetadataEntities, trustedPhotoFileValues, googlePhotosMetadata) as number,
      width: this.createTrustedValueFromMetadata('width', file.absolutePath, photoMetadataEntities, trustedPhotoFileValues, googlePhotosMetadata) as number,
      height: this.createTrustedValueFromMetadata('height', file.absolutePath, photoMetadataEntities, trustedPhotoFileValues, googlePhotosMetadata) as number,
      orientation: this.createTrustedValueFromMetadata('orientation', file.absolutePath, photoMetadataEntities, trustedPhotoFileValues, googlePhotosMetadata) as string,
      deviceMake: this.createTrustedValueFromMetadata('deviceMake', file.absolutePath, photoMetadataEntities, trustedPhotoFileValues, googlePhotosMetadata) as string,
      deviceModel: this.createTrustedValueFromMetadata('deviceModel', file.absolutePath, photoMetadataEntities, trustedPhotoFileValues, googlePhotosMetadata) as string,
      gpsLat: this.createTrustedValueFromMetadata('gpsLat', file.absolutePath, photoMetadataEntities, trustedPhotoFileValues, googlePhotosMetadata) as number,
      gpsLng: this.createTrustedValueFromMetadata('gpsLng', file.absolutePath, photoMetadataEntities, trustedPhotoFileValues, googlePhotosMetadata) as number,
      gpsLatRef: this.createTrustedValueFromMetadata('gpsLatRef', file.absolutePath, photoMetadataEntities, trustedPhotoFileValues, googlePhotosMetadata) as string,
      gpsLngRef: this.createTrustedValueFromMetadata('gpsLngRef', file.absolutePath, photoMetadataEntities, trustedPhotoFileValues, googlePhotosMetadata) as string,
      gpsAltitude: this.createTrustedValueFromMetadata('gpsAltitude', file.absolutePath, photoMetadataEntities, trustedPhotoFileValues, googlePhotosMetadata) as string,
      gpsDate: this.createTrustedValueFromMetadata('gpsDate', file.absolutePath, photoMetadataEntities, trustedPhotoFileValues, googlePhotosMetadata) as string,
      gpsTime: this.createTrustedValueFromMetadata('gpsTime', file.absolutePath, photoMetadataEntities, trustedPhotoFileValues, googlePhotosMetadata) as string,
    })

    const photo = await this.photoRepository.findOne({
      where: {
        photoId: initialPhotoEntity.photoId,
      },
      relations: {
        thumbnail: true,
      },
    })

    this.eventService.emitPrivate(IndexingEvents.PHOTO_ADDED, photo as unknown as Record<string, unknown>)

    return photo
  }

  /**
   * This looks through photo metadata to create a normalized, trusted version
   * of the given metadata key. This function tries its best to come up with
   * some sort of value, but in the worst case scenario it will return null.
   */
  private createTrustedValueFromMetadata(
    name: string,
    absolutePath: string,
    exifMetadata: Partial<PhotoMetadata>[],
    fileMetadata: FileMetadata,
    googlePhotosMetadata: Partial<PhotoMetadata>[],
  ): string | number | null {
    /**
     * Find the first metadata instance, from all metadata sources, whose key is
     * one of the args and has a truthy value, and return that value, else
     * return null.
     */
    const findFirstKeyWithValue = (...args): string => {
      const lookingFor = [...args].map((key: string) => key.toLowerCase())
      let matched

      // Priority 1: check the Google Photos metadata
      matched = googlePhotosMetadata.find((meta) => {
        return lookingFor.includes(meta.metaKey?.toLowerCase()) && meta?.metaValue
      })

      // Priority 2: check the Exif metadata
      if (!matched) {
        matched = exifMetadata.find((meta) => {
          return lookingFor.includes(meta.metaKey?.toLowerCase()) && meta?.metaValue
        })
      }

      return matched?.metaValue || null
    }

    /**
     * Determine the day the photo was taken. This is the most important
     * metadata field for photos, so this function is guarenteed to return a
     * date string. If one cannot be determined, it will use the current time.
     * 
     * Update these docs after updating this function: https://cardinalapps.io/guides/cardinal-media-server/indexing/photos#determining-the-time-a-photo-was-taken
     */
    const getTakenAt = (): string => {
      // 1. Try and find creation time.
      // From Google Photos JSON
      let found = findFirstKeyWithValue('photoTakenTime.formatted')
      // From Exif
      if (!found) found = findFirstKeyWithValue('createdate', 'datetimeoriginal')
      // From GPS in Exif
      if (!found) found = getDateFromGPSFormat(findFirstKeyWithValue('gpsdatestamp') as string, findFirstKeyWithValue('gpstimestamp') as string)?.toString()
      // From file path
      if (!found) found = this.photoService.getDateFromFilePath(absolutePath)

      // 2. Fall back to modified time.
      // From file info
      if (!found) found = findFirstKeyWithValue('modifydate')
      if (!found) found = findFirstKeyWithValue('creationTime.formatted')
      if (!found) found = fileMetadata?.createdAt
      if (!found) found = fileMetadata?.modifiedAt

      found = sanitizeDateString(found)

      // 3. We found a date of some sort
      if (found) {
        // Try to parse it
        if (isNaN(Date.parse(found))) {
          log(LogModule.INDEXING, LogLevel.INFO, `Could not parse date for photo, falling back to current time: ${absolutePath}`)
          log(LogModule.INDEXING, LogLevel.DEBUG, `Found: ${found}, parsed ${Date.parse(found)}`)
          return new Date().toString()
        } else {
          const takenAt = new Date(found).toString()
          log(LogModule.INDEXING, LogLevel.DEBUG, `Evaluated takenAt time ${takenAt} for photo: ${absolutePath}`)
          return takenAt
        }
      }
      // 4. Worst case scenario - if we can't find a value, use the current time
      else {
        log(LogModule.INDEXING, LogLevel.DEBUG, `Could not find a takenAt time for photo, falling back to current time: ${absolutePath}`)
        return new Date().toString()
      }
    }

    switch (name) {
      case 'takenAt': {
        const takenAt = getTakenAt()
        return takenAt
      }

      case 'modifiedAt': {
        const modifiedAt = findFirstKeyWithValue('modifydate')
        return !isNaN(Date.parse(new Date(modifiedAt) as unknown as string)) ? modifiedAt : null
      }

      case 'timestamp': {
        const timestamp = new Date(getTakenAt()).getTime()
        return Number(timestamp) ? Number(timestamp) : null
      }

      case 'takenOnDay': {
        const takenOnDay = new Date(getTakenAt()).toDateString()
        return takenOnDay ? takenOnDay : null
      }

      case 'width': {
        const width = findFirstKeyWithValue('exifimagewidth', 'imagewidth')
        return Number(width) ? Number(width) : null
      }

      case 'height': {
        const height = findFirstKeyWithValue('exifimageheight', 'imageheight')
        return Number(height) ? Number(height) : null
      }

      case 'orientation': {
        const orientation = findFirstKeyWithValue('orientation')
        return orientation || null
      }

      case 'deviceMake':{
        const deviceMake = findFirstKeyWithValue('make')
        return deviceMake || null
      }

      case 'deviceModel': {
        const deviceModel = findFirstKeyWithValue('model', 'googlePhotosOrigin.mobileUpload.deviceType')
        return deviceModel || null
      }

      case 'gpsLat': {
        const lat = findFirstKeyWithValue('geoData.latitude', 'geoDataExif.latitude', 'latitude')
        return Number(lat) ? Number(lat) : null
      }

      case 'gpsLng': {
        const lng = findFirstKeyWithValue('geoData.longitude', 'geoDataExif.longitude', 'longitude')
        return Number(lng) ? Number(lng) : null
      }

      case 'gpsLatRef': {
        const latRef = findFirstKeyWithValue('gpslatituderef')
        return latRef || null
      }

      case 'gpsLngRef': {
        const lngRef = findFirstKeyWithValue('gpslongituderef')
        return lngRef || null
      }

      case 'gpsAltitude': {
        const altitude = findFirstKeyWithValue('geoData.altitude', 'geoDataExif.altitude', 'gpsaltitude')
        return altitude || null
      }

      case 'gpsDate': {
        const gpsDate = findFirstKeyWithValue('gpsdatestamp')
        return gpsDate || null
      }

      case 'gpsTime': {
        const gpsTime = findFirstKeyWithValue('gpstimestamp')
        return gpsTime || null
      }
    }
  }

  /**
   * Reads the Exif data that's embedded in the photo file on the disk and saves
   * it in the database. Exif data is saved as simple key-value pairs, with the
   * value's type also stored so that we can restore the ArrayBuffers later.
   */
  private async createExifMetadata(file: File, photo: Photo, queryRunner?: QueryRunner): Promise<PhotoMetadata[]> {
    const exifData = await this.photoService.getExifFromFile(file.absolutePath)
    const rows = []

    if (!exifData) {
      return []
    }

    for (const [exifKey, exifValue] of Object.entries(exifData)) {
      const row: Partial<PhotoMetadata> = {
        photo,
        metaKey: exifKey,
        metadataFormat: 'exif',
        metadataType: null,
        metaValue: exifValue?.toString() || String(exifValue) || null,
      }

      if (ArrayBuffer.isView(exifValue)) {
        row.metadataType = Object.prototype.toString.call(exifValue)
      } else {
        row.metadataType = typeof exifValue
      }

      rows.push(row)
    }

    try {
      if (queryRunner) {
        return await queryRunner.manager.save(PhotoMetadata, rows)
      } else {
        return await this.photoMetadataRepository.save(rows)
      }
    } catch (error) {
      Logger.error(`Could not save Exif metadata for ${file?.absolutePath}`, 'Indexing')
      Logger.error(error)
      return []
    }
  }

  /**
   * Finds and imports the JSON files that Google Photos creates when a user uses
   * Google Takeout to download their photos from Google Photos.
   */
  private async createGooglePhotosMetadata(file: File, photo: Photo, queryRunner?: QueryRunner): Promise<PhotoMetadata[]> {
    const googlePhotosJSON = await this.photoService.getGooglePhotosMetadata(file.absolutePath)
    const rows = []

    if (!googlePhotosJSON) {
      return []
    }

    const flat = flattenObject(googlePhotosJSON)

    // Add each flattened key
    for (const [key, value] of Object.entries(flat)) {
      const row: Partial<PhotoMetadata> = {
        photo,
        metaKey: key,
        metadataFormat: 'GooglePhotos',
        metadataType: getMetadataType(value),
        metaValue: serializeMetadataValue(value),
      }

      rows.push(row)
    }

    // Add the original object
    rows.push({
      photo,
      metaKey: 'google-photos-json',
      metadataFormat: 'GooglePhotos',
      metadataType: 'json',
      metaValue: JSON.stringify(googlePhotosJSON),
    } as Partial<PhotoMetadata>)

    try {
      if (queryRunner) {
        return await queryRunner.manager.save(PhotoMetadata, rows)
      } else {
        return await this.photoMetadataRepository.save(rows)
      }
    } catch (error) {
      Logger.error(`Could not save Google Photos metadata for ${file?.absolutePath}`, 'Indexing')
      return []
    }
  }
}
