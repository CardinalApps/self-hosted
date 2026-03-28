import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { TranscodingController } from './transcoding.controller'
import { TranscodingService } from './transcoding.service'

import { MusicTrackModule } from '../music-track/music-track.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([]),
    MusicTrackModule,
  ],
  exports: [
    TypeOrmModule,
    TranscodingService,
  ],
  providers: [TranscodingService],
  controllers: [TranscodingController],
})
export class TranscodingModule {}
