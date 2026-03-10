import {
  Controller,
  Delete,
} from '@nestjs/common'
import {
  ApiTags,
} from '@nestjs/swagger'

import { ThumbnailService } from './thumbnail.service'
import { StandardEndpoint } from '../../decorators/StandardEndpoint.decorator'

@Controller()
@ApiTags('Thumbnails')
export class ThumbnailController {
  constructor(private readonly thumbnailService: ThumbnailService) {}

  /**
   * Delete all cached thumbnail files on the disk.
   * 
   * This is a non-standard endpoint mainly used for development. The standard
   * philosophy for deleting thumbnails is to delete the entity that the
   * thumbnails are derived from.
   * 
   * This does NOT delete any entities. This will leave you with broken file
   * paths in your database.
   */
  @Delete('/thumbnails')
  @StandardEndpoint({
    summary: 'Delete all cached thumbnails files.',
    capabilities: ['Indexing.Deindex'],
  })
  async deleteThumbnailFileCache() {
    await this.thumbnailService.deleteThumbnailFileCache()
  }
}
