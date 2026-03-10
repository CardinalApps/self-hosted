import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm'
import { Repository, DataSource, FindManyOptions } from 'typeorm'

import { PhotoAlbum } from './photo-album.entity'
import { PhotoAlbumEntry } from './photo-album-entry.entity'

import { EventService } from '../event/event.service'

import { GetPhotoAlbumEntriesDto } from './dtos/GetPhotoAlbumEntries.dto'

@Injectable()
export class PhotoAlbumEntryService {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
    @InjectRepository(PhotoAlbum)
    private photoAlbumRepository: Repository<PhotoAlbum>,
    @InjectRepository(PhotoAlbumEntry)
    private photoAlbumEntryRepository: Repository<PhotoAlbumEntry>,
    private readonly eventService: EventService,
  ) {}

  /**
   * Adds entries to a photo album.
   * 
   * // TODO
   */
  // async addEntriesToPhotoAlbum(photo: DeepPartial<Photo>, photoAlbumIds: number[] = []): Promise<any> {
  //   return
  // }

  /**
   * Gets the entries from a single photo album.
   * 
   * @param photoAlbumId
   */
  async getPhotoAlbumEntries(
    photoAlbumId: number,
    getPhotoAlbumEntries: GetPhotoAlbumEntriesDto,
  ): Promise<[PhotoAlbumEntry[], number]> {
    const { take, skip, order, orderBy, joinPhoto, joinPhotoAlbum, featured } = getPhotoAlbumEntries
    const query = {
      where: {
        photoAlbum: {
          id: photoAlbumId,
        },
        ...(typeof featured === 'boolean' && { featured }),
      },
      take,
      skip,
      relations: {
        photo: joinPhoto ? { thumbnail: true, file: true, metadata: false } : false,
        photoAlbum: joinPhotoAlbum,
      },
      order: {
        [orderBy]: order,
      },
    } as FindManyOptions<PhotoAlbumEntry>
    return await this.photoAlbumEntryRepository.findAndCount(query)
  }

  /**
   * Returns the total number of entries in a photo album.
   */
  async countPhotoAlbumEntries(photoAlbumId: number): Promise<number> {
    const result = await this.photoAlbumEntryRepository.findAndCount({
      where: {
        photoAlbum: {
          id: photoAlbumId,
        },
      },
      take: 1,
      skip: 0,
    })

    return result?.[1] || 0
  }

  /**
   * 
   * 
   * TODO
   */
  async removeEntriesFromPhotoAlbum(ids: number | number[]): Promise<boolean> {
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
}
