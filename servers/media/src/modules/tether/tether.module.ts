import { Module } from '@nestjs/common'

import { TetherService as TetherService } from './tether.service'

import { EventModule } from '../event/event.module'
import { DatabaseModule } from '../database/database.module'
import { UserModule } from '../user/user.module'

@Module({
  imports: [
    DatabaseModule,
    EventModule,
    UserModule,
  ],
  exports: [TetherService],
  providers: [TetherService],
  controllers: [],
})
export class TetherModule {}
