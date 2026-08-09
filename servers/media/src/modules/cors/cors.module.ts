import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { CorsController } from './cors.controller'
import { CorsOrigin } from './cors-origin.entity'
import { CorsService } from './cors.service'

import { DatabaseModule } from '../database/database.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([CorsOrigin]),
    DatabaseModule,
  ],
  exports: [CorsService],
  providers: [CorsService],
  controllers: [CorsController],
})
export class CorsModule {}
