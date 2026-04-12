import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { RatingController } from './rating.controller'
import { RatingService } from './rating.service'
import { Rating } from './rating.entity'
import { RatingSettings } from './rating-settings.entity'

import { MusicTrackModule } from '../music-track/music-track.module'
import { UserModule } from '../user/user.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([Rating, RatingSettings]),
    MusicTrackModule,
    UserModule,
  ],
  exports: [TypeOrmModule, RatingService],
  providers: [RatingService],
  controllers: [RatingController],
})
export class RatingModule {}
