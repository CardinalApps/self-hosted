import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { RecommendationController } from './recommendation.controller'
import { MusicSpotlightService } from './music-spotlight.service'

import { MusicArtist } from '../music-artist/music-artist.entity'
import { MusicRelease } from '../music-release/music-release.entity'
import { MusicHistory } from '../music-history/music-history.entity'
import { Rating } from '../rating/rating.entity'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MusicArtist,
      MusicRelease,
      MusicHistory,
      Rating,
    ]),
  ],
  providers: [MusicSpotlightService],
  controllers: [RecommendationController],
})
export class RecommendationModule {}
