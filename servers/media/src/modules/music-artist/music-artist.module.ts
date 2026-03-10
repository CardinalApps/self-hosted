import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { MusicArtistController } from './music-artist.controller'
import { MusicArtistService } from './music-artist.service'

import { MusicArtist } from './music-artist.entity'
import { MusicArtistMetadata } from './music-artist-metadata.entity'

import { EventModule } from '../event/event.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([MusicArtist, MusicArtistMetadata]),
    EventModule,
  ],
  exports: [
    TypeOrmModule,
    MusicArtistService,
  ],
  providers: [MusicArtistService],
  controllers: [MusicArtistController],
})
export class MusicArtistModule {}
