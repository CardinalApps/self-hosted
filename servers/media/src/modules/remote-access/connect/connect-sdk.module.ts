import { Module } from '@nestjs/common'
import { WebSocket } from 'ws'

import { ConnectSDKController } from './connect-sdk.controller'
import { ConnectSDKEvents } from './connect-sdk.events'
import { ConnectSDKService, CONNECT_WS_FACTORY, ConnectWsFactory } from './connect-sdk.service'
import { HttpsStatusStore } from './https-status.store'
import { TokenRefresher } from './token-refresher'

import { DatabaseModule } from '../../database/database.module'

const defaultWsFactory: ConnectWsFactory = (url: string) => new WebSocket(url)

@Module({
  imports: [
    DatabaseModule,
  ],
  exports: [ConnectSDKService, ConnectSDKEvents, HttpsStatusStore],
  providers: [
    ConnectSDKService,
    ConnectSDKEvents,
    HttpsStatusStore,
    TokenRefresher,
    { provide: CONNECT_WS_FACTORY, useValue: defaultWsFactory },
  ],
  controllers: [ConnectSDKController],
})
export class ConnectSDKModule {}
