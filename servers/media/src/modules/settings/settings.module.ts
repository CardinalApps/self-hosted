import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { SettingsController } from './settings.controller'
import { SettingsService } from './settings.service'
import { Setting } from './setting.entity'

/**
 * The Settings module stores the settings of Cardinal client apps and settings
 * for itself. It handles settings synchronization and settings persistance
 * between client cache wipes.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Setting])],
  exports: [TypeOrmModule, SettingsService],
  providers: [SettingsService],
  controllers: [SettingsController],
})
export class SettingsModule {}
