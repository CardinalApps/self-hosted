import { Controller, Get } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'

import { StandardEndpoint } from '../../decorators/StandardEndpoint.decorator'

import { PopularityService } from './popularity.service'

@Controller('popularity')
@ApiTags('Popularity')
export class PopularityController {
  constructor(private readonly popularityService: PopularityService) {}

  /**
   * Get this server's lifetime Popularity Data Pool contribution stats.
   */
  @Get('stats')
  @StandardEndpoint({
    summary: "Get this server's Popularity Data Pool contribution stats.",
    capabilities: ['ServerSettings.Update'],
  })
  async getStats(): Promise<{ playsContributed: number }> {
    return await this.popularityService.getStats()
  }
}
