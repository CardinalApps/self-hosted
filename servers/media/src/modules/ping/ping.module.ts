import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'

import { PingController } from './ping.controller'

import { DatabaseModule } from '../database/database.module'

import { VerifyProbe } from '../../middleware/VerifyProbe.middleware'

@Module({
  imports: [
    DatabaseModule,
  ],
  controllers: [PingController],
})
export class PingModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(VerifyProbe).forRoutes(PingController)
  }
}
