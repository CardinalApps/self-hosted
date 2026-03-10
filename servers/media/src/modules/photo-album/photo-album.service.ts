import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm'
import { Repository, DataSource, DeepPartial, In } from 'typeorm'
import { v4 as uuid } from 'uuid'

import { PhotoAlbum } from './photo-album.entity'
import { PhotoAlbumEntry } from './photo-album-entry.entity'
import { PhotoAlbumMetadata } from './photo-album-metadata.entity'

import { Photo } from '../photo/photo.entity'
import { EventService } from '../event/event.service'

import { GetPhotoAlbumsDto } from './dtos/GetPhotoAlbums.dto'

//import { PhotoAlbumMetadataKeys } from './types'

@Injectable()
export class PhotoAlbumService {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
    @InjectRepository(PhotoAlbum)
    private photoAlbumRepository: Repository<PhotoAlbum>,
    @InjectRepository(PhotoAlbumEntry)
    private photoAlbumEntryRepository: Repository<PhotoAlbumEntry>,
    @InjectRepository(PhotoAlbumMetadata)
    private photoAlbumMetadataRepository: Repository<PhotoAlbumMetadata>,
    private readonly eventService: EventService,
  ) {}

  /**
   * Returns all photos in order from newest to oldest.
   */
  async getPhotoAlbums(getPhotoAlbumsDto: GetPhotoAlbumsDto): Promise<[PhotoAlbum[], number]> {
    const { take, skip, order, orderBy } = getPhotoAlbumsDto
    return await this.photoAlbumRepository.findAndCount({
      take,
      skip,
      relations: {
        metadata: true,
      },
      order: {
        [orderBy]: order,
      },
    })
  }

  /**
   * Returns the total number of photo albums.
   */
  async countPhotoAlbums(): Promise<number> {
    const result = await this.photoAlbumRepository.findAndCount({
      take: 1,
      skip: 0,
    })

    return result?.[1] || 0
  }

  /**
   * Gets a single photo album.
   */
  async getPhotoAlbum(id: number, includePhotos = true, includeMetadata = true): Promise<PhotoAlbum | null> {
    const photoAlbum = await this.photoAlbumRepository.find({
      where: {
        id: id,
      },
      relations: {
        entries: includePhotos ? { photo: true } : false,
        metadata: includeMetadata,
      },
    })

    if (!photoAlbum.length) {
      return null
    }

    return photoAlbum[0]
  }

  /**
   * Creates a new photo album.
   */
  async createPhotoAlbum(name = 'New Photo Album'): Promise<PhotoAlbum> {
    const photoAlbum = await this.photoAlbumRepository.save({
      photoAlbumId: uuid(),
      name,
    })

    return photoAlbum
  }

  /**
   * Updates a photo album.
   */
  async updatePhotoAlbum(id, update: Partial<PhotoAlbum>): Promise<PhotoAlbum> {
    const result = await this.photoAlbumRepository.update(id, update)

    if (result?.affected !== 1) {
      Logger.error(`Error updating photo album ${id}`)
    }

    return await this.getPhotoAlbum(id)
  }

  /**
   * Deletes a photo album. Does not delete photo entities.
   */
  async deletePhotoAlbums(ids: number | number[]): Promise<boolean> {
    if (!Array.isArray(ids)) {
      ids = [ids]
    }

    const deleted = await this.photoAlbumRepository.delete(ids)

    if (deleted?.affected === ids.length) {
      return true
    } else {
      Logger.log(`Unexpected amount of deleted photo albums. Wanted to delete: (${ids.length}), but deleted (${deleted?.affected}) instead.`, 'Photo Albums')
      return false
    }
  }

  /**
   * Adds a photo to one or more photo albums.
   */
  async addPhotoToAlbums(photo: DeepPartial<Photo>, photoAlbumIds: number[] = []): Promise<void> {
    const nonDuplicates = []

    // Don't allow duplicate photos in the same album
    for (const photoAlbumId of photoAlbumIds) {
      const exists = await this.photoAlbumEntryRepository.find({
        where: {
          photoAlbum: {
            id: photoAlbumId,
          },
          photo: {
            id: photo.id,
          },
        },
        relations: {
          photoAlbum: true,
        },
      })
      if (!exists.length) {
        nonDuplicates.push({
          photo: photo.id,
          photoAlbum: photoAlbumId,
          photoAlbumEntryId: uuid(),
        })
      }
    }

    await this.photoAlbumEntryRepository.save(nonDuplicates as DeepPartial<PhotoAlbumEntry>)

    // Ensure that all the photo albums that we added photos to also have a featured image
    const allAlbums = nonDuplicates.map((match) => match.photoAlbum)
    for (const album of allAlbums) {
      await this.ensureAlbumHasFeaturedPhoto(album, photo.id)
    }
  }

  /**
   * Removed a photo from one or more photo albums.
   */
  async removePhotoFromAlbums(photo: DeepPartial<Photo>, photoAlbumIds: number[] = []): Promise<number> {
    const entriesToDelete = await this.photoAlbumEntryRepository.find({
      where: {
        photoAlbum: {
          id: In(photoAlbumIds),
        },
        photo: {
          id: photo.id,
        },
      },
    })

    if (!entriesToDelete || !entriesToDelete.length) {
      return 0
    }

    const deleted = await this.photoAlbumEntryRepository.remove(entriesToDelete)

    if (!deleted || !deleted.length) {
      throw new Error('Could not delete photo album entries.')
    }

    return deleted.length
  }

  /**
   * Checks if the given photo album(s) have at least one featured photo, and if
   * not, adds the provided fallback photo as the cover. If none is supplied,
   * the first result from the database will be used.
   * 
   * Albums can have multiple featured photos.
   */
  async ensureAlbumHasFeaturedPhoto(photoAlbumId: number, fallbackPhotoId): Promise<void> {
    const featuredPhotos = await this.getFeaturedPhotos(photoAlbumId)
    if (!featuredPhotos.length) {
      const album = await this.getPhotoAlbum(photoAlbumId)
      if (album.entries.length) {
        await this.addFeaturedPhoto(photoAlbumId, fallbackPhotoId || album.entries?.[0]?.photo?.id)
      } else {
        Logger.warn(`Tried to set a featured photo for album ${photoAlbumId} but couldn't because no photos were found in the album.`, 'Photo Albums')
      }
    }
  }

  /**
   * Returns all of the featured photos for a photo album.
   */
  async getFeaturedPhotos(photoAlbumId): Promise<PhotoAlbumEntry[]> {
    const found = await this.photoAlbumEntryRepository.find({
      where: {
        featured: true,
        photoAlbum: {
          id: photoAlbumId,
        },
      },
    })
    return found
  }

  /**
   * Adds a featured photo to an album.
   */
  async addFeaturedPhoto(photoAlbumId, photoId): Promise<boolean> {
    if (!photoAlbumId || !photoId) {
      Logger.error('Cannot add featured photo, missing parameter')
      return
    }
    const result = await this.photoAlbumEntryRepository.update(
      { photoAlbum: photoAlbumId, photo: photoId },
      { featured: true },
    )
    return !!result.affected
  }
}
