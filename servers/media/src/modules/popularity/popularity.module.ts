import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { PopularityService } from './popularity.service'
import { PopularityController } from './popularity.controller'
import { PopularityStats } from './popularity-stats.entity'

import { SettingsModule } from '../settings/settings.module'

import { MusicHistory } from '../music-history/music-history.entity'

@Module({
  imports: [
    TypeOrmModule.forFeature([MusicHistory, PopularityStats]),
    SettingsModule,
  ],
  exports: [PopularityService],
  controllers: [PopularityController],
  providers: [PopularityService],
})
export class PopularityModule {}
