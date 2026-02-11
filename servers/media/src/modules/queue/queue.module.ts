import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { QueueController } from './queue.controller'
import { QueueService } from './queue.service'

import { Queue } from './queue.entity'

import { EventModule } from '../event/event.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([Queue]),
    EventModule,
  ],
  exports: [
    TypeOrmModule,
    QueueService,
  ],
  providers: [QueueService],
  controllers: [QueueController],
})
export class QueueModule {}
