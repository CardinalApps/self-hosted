import {
  Controller,
  Body,
  Get,
  Put,
  Delete,
  Query,
  Param,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'

import { CurrentUser } from '../../decorators/CurrentUser.decorator'
import { StandardEndpoint } from '../../decorators/StandardEndpoint.decorator'

import { Rating } from './rating.entity'
import { RatingService } from './rating.service'
import { RatingMediaType } from './rating.entity'

import { SetRatingDto } from './dtos/SetRating.dto'
import { GetRatingsDto } from './dtos/GetRatings.dto'

@ApiTags('Ratings')
@Controller('ratings')
export class RatingController {
  constructor(private readonly ratingService: RatingService) {}

  /**
   * Set or update the current user's rating for a media item.
   */
  @Put()
  @StandardEndpoint({
    summary: 'Set a rating for a media item.',
    capabilities: ['Ratings.Create'],
  })
  async setRating(
    @CurrentUser() user,
    @Body() setRatingDto: SetRatingDto,
  ): Promise<Rating> {
    return await this.ratingService.upsertRating(user, setRatingDto)
  }

  /**
   * Remove the current user's rating for a media item.
   */
  @Delete(':mediaType/:mediaId')
  @StandardEndpoint({
    summary: 'Remove a rating for a media item.',
    capabilities: ['Ratings.Delete'],
  })
  async deleteRating(
    @CurrentUser() user,
    @Param('mediaType') mediaType: RatingMediaType,
    @Param('mediaId') mediaId: string,
  ): Promise<void> {
    return await this.ratingService.deleteRating(user, mediaType, mediaId)
  }

  /**
   * Query the current user's ratings. Pass favorites=true to get only favorites.
   * Pass type to filter by media type and hydrate the associated media object.
   */
  @Get()
  @StandardEndpoint({
    summary: 'Query ratings for the currently logged in user.',
    capabilities: ['Ratings.Read'],
  })
  async queryRatings(
    @CurrentUser() user,
    @Query() query: GetRatingsDto,
  ): Promise<[Rating[], number]> {
    return await this.ratingService.query(user, query, query.type)
  }

}
