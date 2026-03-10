import { forwardRef, Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { EventService } from './event.service'
import { EventController } from './event.controller'
import { Event } from './event.entity'

import { AuthModule } from '../auth/auth.module'
import { UserModule } from '../user/user.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([Event]),
    forwardRef(() => AuthModule),
    forwardRef(() => UserModule),
  ],
  exports: [TypeOrmModule, EventService],
  providers: [EventService],
  controllers: [EventController],
})
export class EventModule {}
