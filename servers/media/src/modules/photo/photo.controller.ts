import * as fs from 'fs'
import {
  Controller,
  Body,
  Get,
  Patch,
  Query,
  Logger,
  NotFoundException,
  Response,
  Param,
  Headers,
  StreamableFile,
  InternalServerErrorException,
} from '@nestjs/common'
import {
  ApiTags,
  ApiSecurity,
  ApiOkResponse,
  ApiParam,
} from '@nestjs/swagger'

import { ApiSecurityTypes } from '../../guards/types'

import { Photo } from './photo.entity'
import { PhotoService } from './photo.service'
import { EventService } from '../event/event.service'

import { GetPhotosDto } from './dtos/GetPhotos.dto'
import { GetPhotoDto } from './dtos/GetPhoto.dto'
import { GetPhotoBlobDto } from './dtos/GetPhotoBlob.dto'
import { UpdatePhotoParamsDto, UpdatePhotoBodyDto } from './dtos/UpdatePhoto.dto'
import { getPhotoThumbnailDto } from './dtos/GetPhotoThumbnail.dto'

import { PhotoEvents } from './events'

import { getAppDir } from '../../utils/env'
import { SupportedPhotoFileExtensions, canonicalExtension } from '../../utils/media'
import { PhotoTransformationHeaders } from '../../utils/headers'
import { StandardEndpoint } from '../../decorators/StandardEndpoint.decorator'

const photoIdParam = {
  name: 'id',
  type: String,
  description: 'The photo to address, given as either its numeric row ID or its UUID photo ID.',
}

@Controller()
@ApiTags('Photos')
export class PhotoController {
  constructor(
    private readonly photoService: PhotoService,
    private readonly eventService: EventService,
  ) {}

  /**
   * Get the users photos.
   */
  @Get('/photos')
  @StandardEndpoint({
    summary: 'Get your photos.',
    capabilities: ['Photos.Read'],
  })
  @ApiOkResponse({
    status: 200,
    description: 'Returns an array where the first item is an array of query results, and the second item is the total number of photos.',
    schema: {
      example: [
        [
          { photoId: '7b74fae5-c377-4352-983d-0981e9b9fbec' },
          { photoId: '7b74fae5-c377-4352-983d-0981e9b9fbec' },
          { photoId: '7b74fae5-c377-4352-983d-0981e9b9fbec' },
          { photoId: '7b74fae5-c377-4352-983d-0981e9b9fbec' },
        ],
        24,
      ] as [Photo[], number],
    },
  })
  @ApiSecurity(ApiSecurityTypes.LOCAL_USER_JWT)
  async getPhotos(@Query() query: GetPhotosDto): Promise<[Photo[], number]> {
    return await this.photoService.getPhotos(query)
  }

  /**
   * Returns the number of photo entities in the database (not the number of
   * files on the disk).
   */
  @Get('/photos/count')
  @StandardEndpoint({
    summary: 'Count your photos.',
    capabilities: ['Photos.Read'],
  })
  async countPhotos(): Promise<number> {
    return await this.photoService.countPhotos()
  }

  /**
   * Get data about a photo. Accepts the numeric row ID or the photoId.
   */
  @Get('/photo/:id')
  @StandardEndpoint({
    summary: 'Get data about a photo.',
    capabilities: ['Photos.Read'],
  })
  @ApiParam(photoIdParam)
  async getPhoto(@Param('id') id: string, @Query() query: GetPhotoDto): Promise<Photo> {
    const found = await this.photoService.getPhoto(id, {
      file: query.file,
      metadata: query.metadata,
      thumbnails: query.thumbnails,
      photoAlbumEntries: query.photoAlbumEntries ? { photoAlbum: true } : false,
    })

    if (!found) {
      throw new NotFoundException()
    }

    return found
  }

  /**
   * Returns the blob data of one of the photos in the photo library. Accepts
   * the numeric row ID or the photoId.
   */
  @Get('/photo/:id/blob')
  @StandardEndpoint({
    summary: 'Get a photo blob.',
    capabilities: ['Photos.Read'],
  })
  @ApiParam(photoIdParam)
  async getPhotoBlob(
    @Param('id') id: string,
    @Query() query: GetPhotoBlobDto,
    @Headers() headers,
    @Response({ passthrough: true }) response,
  ): Promise<StreamableFile> {
    const photo = await this.photoService.getPhoto(id, {
      file: true,
      variations: true,
    })

    if (!photo) {
      throw new NotFoundException()
    }

    let file
    let convertedFrom: string = null

    // HEIF to JPEG for clients that don't support it
    if (
      query.autoConvert
      && canonicalExtension(photo.file.extension) === SupportedPhotoFileExtensions.HEIF
      && !this.photoService.clientDeviceSupportsHEIF(headers?.['user-agent'])
    ) {
      const jpegVariation = photo.variations?.find((variation) => {
        return canonicalExtension(variation.format) === SupportedPhotoFileExtensions.JPEG
      })

      if (jpegVariation) {
        file = fs.createReadStream(jpegVariation.absolutePath)
        convertedFrom = photo.file.extension
      } else {
        // No variation to reach for, so convert now (this is slow). The
        // conversion yields nothing when the source cannot be read or decoded.
        const converted = await this.photoService.heifToJpeg(photo.file.absolutePath)

        if (converted) {
          file = converted
          convertedFrom = photo.file.extension
        }
      }
    }

    // Anything the client asked not to convert, could not be converted, or was
    // never a candidate is served as it sits on disk.
    if (!file) {
      file = fs.createReadStream(photo.file.absolutePath)
    }

    if (convertedFrom) {
      response.set({ 'Access-Control-Expose-Headers': '*' })
      response.set({ [PhotoTransformationHeaders.CONVERTED_PHOTO_FROM]: convertedFrom })
      response.set({ [PhotoTransformationHeaders.CONVERTED_PHOTO_TO]: SupportedPhotoFileExtensions.JPEG })
    }

    return new StreamableFile(file)
  }

  /**
   * Updates a photo. Accepts the numeric row ID or the photoId.
   */
  @Patch('/photo/:id')
  @StandardEndpoint({
    summary:  'Update a photo.',
    capabilities: ['Photos.Update'],
  })
  @ApiParam(photoIdParam)
  async updatePhoto(
    @Param() { id }: UpdatePhotoParamsDto,
    @Body() body: UpdatePhotoBodyDto,
  ): Promise<Photo> {
    const found = await this.photoService.getPhoto(id)

    if (!found) {
      throw new NotFoundException()
    }

    // Update photo albums
    if (body.photoAlbums.length) {
      try {
        const updated = await this.photoService.setPhotoAlbums(id, body.photoAlbums)
        this.eventService.emitPublic(PhotoEvents.UPDATED, updated as unknown as Record<string, unknown>)
      } catch (error) {
        Logger.log(error)
        throw new InternalServerErrorException()
      }
    }

    return await this.photoService.getPhoto(id)
  }

  /**
   * Returns the blob data of a photo thumbnail. Accepts the numeric row ID or
   * the photoId.
   */
  @Get('/photo/:id/thumbnail')
  @StandardEndpoint({
    summary:  'Get a photo thumbnail.',
    capabilities: ['Photos.Read'],
  })
  @ApiParam(photoIdParam)
  async getReleaseCoverBlob(
    @Param('id') id: string,
    @Query() query: getPhotoThumbnailDto,
  ): Promise<StreamableFile> {
    const photo = await this.photoService.getPhoto(id, {
      thumbnail: true,
    })

    if (!photo) {
      throw new NotFoundException('Photo not found.')
    }

    const thumbnail = photo.thumbnail?.find((thumb) => thumb.size === query.size)

    if (!thumbnail) {
      throw new NotFoundException('No thumbnail of this size found for this photo.')
    }

    const thumbnailFile = getAppDir(thumbnail.relativeSrc)
    const file = fs.createReadStream(thumbnailFile)

    return new StreamableFile(file)
  }
}
