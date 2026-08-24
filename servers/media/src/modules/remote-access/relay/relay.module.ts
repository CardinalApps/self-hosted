import { Module } from '@nestjs/common'

import { RelayRequestHandler } from './relay-request-handler'

import { ConnectSDKModule } from '../connect/connect-sdk.module'

@Module({
  imports: [
    ConnectSDKModule,
  ],
  exports: [RelayRequestHandler],
  providers: [RelayRequestHandler],
})
export class RelayModule {}
