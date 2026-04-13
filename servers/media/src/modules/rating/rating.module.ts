import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { RatingController } from './rating.controller'
import { RatingService } from './rating.service'
import { Rating } from './rating.entity'

import { UserModule } from '../user/user.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([Rating]),
    UserModule,
  ],
  exports: [TypeOrmModule, RatingService],
  providers: [RatingService],
  controllers: [RatingController],
})
export class RatingModule {}
