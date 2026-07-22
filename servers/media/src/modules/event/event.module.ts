import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { EventService } from './event.service'
import { EventController } from './event.controller'
import { Event } from './event.entity'

@Module({
  imports: [
    TypeOrmModule.forFeature([Event]),
  ],
  exports: [TypeOrmModule, EventService],
  providers: [EventService],
  controllers: [EventController],
})
export class EventModule {}
