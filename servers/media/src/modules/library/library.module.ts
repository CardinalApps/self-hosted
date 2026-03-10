import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { LibraryController } from './library.controller'
import { LibraryService } from './library.service'
import { Library } from './library.entity'

import { EventModule } from '../event/event.module'
import { UserModule } from '../user/user.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([Library]),
    UserModule,
    EventModule,
  ],
  exports: [TypeOrmModule, LibraryService],
  providers: [LibraryService],
  controllers: [LibraryController],
})
export class LibraryModule {}
