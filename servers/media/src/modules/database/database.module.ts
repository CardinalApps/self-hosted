import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { DatabaseService } from './database.service'
import { Option } from './option.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Option])],
  exports: [TypeOrmModule, DatabaseService],
  providers: [DatabaseService],
})
export class DatabaseModule {}
