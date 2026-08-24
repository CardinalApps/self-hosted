import * as net from 'net'
import { Module } from '@nestjs/common'

import { MuxService, NET_SERVER_FACTORY, NetServerFactory } from './mux.service'

const defaultNetServerFactory: NetServerFactory = (connectionListener) => net.createServer(connectionListener)

@Module({
  exports: [MuxService],
  providers: [
    MuxService,
    { provide: NET_SERVER_FACTORY, useValue: defaultNetServerFactory },
  ],
})
export class MuxModule {}
