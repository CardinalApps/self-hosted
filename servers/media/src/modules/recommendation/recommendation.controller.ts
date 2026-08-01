import { Controller, Get } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'

import { MusicSpotlightService } from './music-spotlight.service'
import { GetMusicArtistSpotlightResponse } from './types'

import { CurrentUser } from '../../decorators/CurrentUser.decorator'
import { StandardEndpoint } from '../../decorators/StandardEndpoint.decorator'

@Controller()
@ApiTags('Music')
export class RecommendationController {
  constructor(private readonly musicSpotlightService: MusicSpotlightService) {}

  /**
   * Get the artist spotlight for the current user.
   */
  @Get('/music/spotlight/artist')
  @StandardEndpoint({
    summary: 'Get the artist spotlight for the current user: a personal artist pick with the reason it was picked.',
    capabilities: ['MusicArtists.Read'],
  })
  async getArtistSpotlight(@CurrentUser() user): Promise<GetMusicArtistSpotlightResponse> {
    return {
      spotlight: await this.musicSpotlightService.getArtistSpotlight(user),
    }
  }
}
