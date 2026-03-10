import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { MusicGenreController } from './music-genre.controller'
import { MusicGenreService } from './music-genre.service'

import { MusicGenre } from './music-genre.entity'

import { EventModule } from '../event/event.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([MusicGenre]),
    EventModule,
  ],
  exports: [
    TypeOrmModule,
    MusicGenreService,
  ],
  providers: [MusicGenreService],
  controllers: [MusicGenreController],
})
export class MusicGenreModule {}
