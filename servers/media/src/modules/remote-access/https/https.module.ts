import * as https from 'https'
import { Module } from '@nestjs/common'

import { HTTPS_SERVER_FACTORY, HttpsServerFactory, HttpsService } from './https.service'

import { ConnectSDKModule } from '../connect/connect-sdk.module'
import { DatabaseModule } from '../../database/database.module'
import { PortMapperModule } from '../port-mapper/port-mapper.module'

const defaultHttpsServerFactory: HttpsServerFactory = (options, listener) => https.createServer(options, listener)

@Module({
  imports: [
    DatabaseModule,
    ConnectSDKModule,
    PortMapperModule,
  ],
  exports: [HttpsService],
  providers: [
    HttpsService,
    { provide: HTTPS_SERVER_FACTORY, useValue: defaultHttpsServerFactory },
  ],
})
export class HttpsModule {}
