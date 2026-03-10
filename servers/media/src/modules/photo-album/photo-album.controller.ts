import {
  Controller,
  Body,
  Get,
  Post,
  Delete,
  Patch,
  Query,
  NotFoundException,
  Param,
  InternalServerErrorException,
} from '@nestjs/common'
import {
  ApiTags,
} from '@nestjs/swagger'

import { PhotoAlbum, PhotoAlbumComputed } from './photo-album.entity'
import { PhotoAlbumEntry } from './photo-album-entry.entity'
import { PhotoAlbumService } from './photo-album.service'
import { PhotoAlbumEntryService } from './photo-album-entry.service'

import { GetPhotoAlbumsDto } from './dtos/GetPhotoAlbums.dto'
import { GetPhotoAlbumDto } from './dtos/GetPhotoAlbum.dto'
import { GetPhotoAlbumEntriesParamsDto, GetPhotoAlbumEntriesDto } from './dtos/GetPhotoAlbumEntries.dto'
import { CreatePhotoAlbumDto } from './dtos/CreatePhotoAlbum.dto'
import { DeletePhotoAlbumsDto } from './dtos/DeletePhotoAlbums.dto'
import { UpdatePhotoAlbumParamsDto, UpdatePhotoAlbumBodyDto } from './dtos/UpdatePhotoAlbum.dto'

import { EventService } from '../event/event.service'
import { PhotoAlbumEvents } from './events'
import { StandardEndpoint } from '../../decorators/StandardEndpoint.decorator'

@Controller()
@ApiTags('Photo Albums')
export class PhotoAlbumController {
  constructor(
    private readonly photoAlbumService: PhotoAlbumService,
    private readonly photoAlbumEntryService: PhotoAlbumEntryService,
    private readonly eventService: EventService,
  ) {}

  /**
   * Get a photo album.
   */
  @Get('/photo-album/:id')
  @StandardEndpoint({
    summary: 'Get a single photo album.',
    capabilities: ['PhotoAlbums.Read'],
  })
  async getPhotoAlbum(@Param() { id }: GetPhotoAlbumDto): Promise<PhotoAlbum> {
    const photoAlbum = await this.photoAlbumService.getPhotoAlbum(id, false)

    if (!photoAlbum) {
      throw new NotFoundException()
    }

    return photoAlbum
  }

  /**
   * Get photo albums.
   */
  @Get('/photo-albums')
  @StandardEndpoint({
    summary: 'Get your photo albums.',
    capabilities: ['PhotoAlbums.Read'],
  })
  async getPhotoAlbums(@Query() query: GetPhotoAlbumsDto): Promise<[PhotoAlbumComputed[], number]> {
    const data = await this.photoAlbumService.getPhotoAlbums(query)

    // Attach extra computed data to each returned object
    for (const i in data[0]) {
      (data[0][i] as PhotoAlbumComputed).numEntries = await this.photoAlbumEntryService.countPhotoAlbumEntries(data[0][i].id)
    }

    return data
  }

  /**
   * Endpoint optimized just for counting photo albums.
   */
  @Get('/photo-albums/count')
  @StandardEndpoint({
    summary: 'Count your photo albums.',
    capabilities: ['PhotoAlbums.Read'],
  })
  async countPhotoAlbums(): Promise<number> {
    return await this.photoAlbumService.countPhotoAlbums()
  }

  /**
   * Creates a new photo album.
   */
  @Post('/photo-album')
  @StandardEndpoint({
    summary: 'Create a new photo album.',
    capabilities: ['PhotoAlbums.Create'],
  })
  async createPhotoAlbum(@Body() { name }: CreatePhotoAlbumDto): Promise<PhotoAlbum> {
    const created = await this.photoAlbumService.createPhotoAlbum(name)
    this.eventService.emitPublic(PhotoAlbumEvents.PHOTO_ALBUM_CREATED, created as unknown as Record<string, unknown>)
    return created
  }

  /**
   * Updates a photo album.
   */
  @Patch('/photo-album/:id')
  @StandardEndpoint({
    summary: 'Update a photo album.',
    capabilities: ['PhotoAlbums.Update'],
  })
  async updatePhotoAlbum(
    @Param() { id }: UpdatePhotoAlbumParamsDto,
    @Body() body: UpdatePhotoAlbumBodyDto,
  ): Promise<PhotoAlbum> {
    if (!await this.photoAlbumService.getPhotoAlbum(id)) throw new NotFoundException()

    const updated = await this.photoAlbumService.updatePhotoAlbum(id, body)
    this.eventService.emitPublic(PhotoAlbumEvents.PHOTO_ALBUM_UPDATED, updated as unknown as Record<string, unknown>)

    return updated
  }

  /**
   * Deletes a photo album and the entry entities. Does not delete the original photos.
   */
  @Delete('/photo-album/:id')
  @StandardEndpoint({
    summary: 'Delete a photo album.',
    capabilities: ['PhotoAlbums.Delete'],
  })
  async deletePhotoAlbum(@Param() { id }: DeletePhotoAlbumsDto): Promise<void> {
    if (!await this.photoAlbumService.getPhotoAlbum(id)) throw new NotFoundException()

    const deleted = await this.photoAlbumService.deletePhotoAlbums(id)
    if (!deleted) throw new InternalServerErrorException()

    this.eventService.emitPublic(PhotoAlbumEvents.PHOTO_ALBUM_DELETED, { deleted })
  }

  /**
   * Get entries from a photo album.
   */
  @Get('/photo-album/:id/entries')
  @StandardEndpoint({
    summary: 'Get photo album entries.',
    capabilities: ['PhotoAlbums.Read'],
  })
  async getPhotoAlbumEntries(
    @Param() { id }: GetPhotoAlbumEntriesParamsDto,
    @Query() query: GetPhotoAlbumEntriesDto,
  ): Promise<[PhotoAlbumEntry[], number]> {
    const foundPhotoAlbum = await this.photoAlbumService.getPhotoAlbum(id)

    if (!foundPhotoAlbum) {
      throw new NotFoundException()
    }

    return await this.photoAlbumEntryService.getPhotoAlbumEntries(id, query)
  }
}
