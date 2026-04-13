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

import { SetRatingDto } from './dtos/SetRating.dto'
import { GetRatingsDto } from './dtos/GetRatings.dto'

@ApiTags('Ratings')
@Controller('ratings')
export class RatingController {
  constructor(private readonly ratingService: RatingService) {}

  /**
   * Set or update the current user's rating for a music track.
   */
  @Put()
  @StandardEndpoint({
    summary: 'Set a rating for a music track.',
    capabilities: ['Ratings.Create'],
  })
  async setRating(
    @CurrentUser() user,
    @Body() setRatingDto: SetRatingDto,
  ): Promise<Rating> {
    return await this.ratingService.upsertRating(user, setRatingDto)
  }

  /**
   * Remove the current user's rating for a music track.
   */
  @Delete(':trackId')
  @StandardEndpoint({
    summary: 'Remove a rating for a music track.',
    capabilities: ['Ratings.Delete'],
  })
  async deleteRating(
    @CurrentUser() user,
    @Param('trackId') trackId: string,
  ): Promise<void> {
    return await this.ratingService.deleteRating(user, trackId)
  }

  /**
   * Query the current user's ratings. Pass favorites=true to get only favorites.
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
    return await this.ratingService.query(user, query)
  }

}
