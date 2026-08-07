import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { PopularityService } from './popularity.service'

import { MusicHistory } from '../music-history/music-history.entity'

@Module({
  imports: [
    TypeOrmModule.forFeature([MusicHistory]),
  ],
  exports: [PopularityService],
  providers: [PopularityService],
})
export class PopularityModule {}
