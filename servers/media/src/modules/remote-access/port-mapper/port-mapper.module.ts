import { Module } from '@nestjs/common'
import { createClient } from 'nat-upnp'

import { PortMapperController } from './port-mapper.controller'
import { PortMapperService } from './port-mapper.service'
import { UPNP_CLIENT_FACTORY, UpnpClientFactory } from './port-mapper.types'

import { DatabaseModule } from '../../database/database.module'
import { SettingsModule } from '../../settings/settings.module'

const defaultUpnpClientFactory: UpnpClientFactory = () => createClient()

@Module({
  imports: [
    DatabaseModule,
    SettingsModule,
  ],
  exports: [PortMapperService],
  providers: [
    PortMapperService,
    { provide: UPNP_CLIENT_FACTORY, useValue: defaultUpnpClientFactory },
  ],
  controllers: [PortMapperController],
})
export class PortMapperModule {}
