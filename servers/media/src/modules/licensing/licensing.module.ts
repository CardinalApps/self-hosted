import { forwardRef, Module } from '@nestjs/common'

import { LicensingService } from './licensing.service'
import { UserModule } from '../user/user.module'

@Module({
  imports: [
    forwardRef(() => UserModule),
  ],
  exports: [
    LicensingService,
  ],
  providers: [
    LicensingService,
  ],
  controllers: [],
})
export class LicensingModule {}
