import { Module } from '@nestjs/common'

import { ClaimService } from './claim.service'

import { EventModule } from '../event/event.module'
import { DatabaseModule } from '../database/database.module'
import { UserModule } from '../user/user.module'
import { SettingsModule } from '../settings/settings.module'

@Module({
  imports: [
    DatabaseModule,
    EventModule,
    UserModule,
    SettingsModule,
  ],
  exports: [ClaimService],
  providers: [ClaimService],
  controllers: [],
})
export class ClaimModule {}
