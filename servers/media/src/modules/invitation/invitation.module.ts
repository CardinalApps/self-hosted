import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { InvitationController } from './invitation.controller'
import { InvitationService } from './invitation.service'

import { Invitation } from './invitation.entity'

import { EventModule } from '../event/event.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([Invitation]),
    EventModule,
  ],
  exports: [
    TypeOrmModule,
    InvitationService,
  ],
  providers: [InvitationService],
  controllers: [InvitationController],
})
export class InvitationModule {}
