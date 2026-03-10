import { IsString, IsOptional, IsObject } from 'class-validator'

import { SettingsObject } from '../types'

import { CardinalApp } from '../../../utils/apps'

export class UpsertSettings {
  /**
   * Leave blank to have the settings update apply to all apps
   */
  @IsString()
  @IsOptional()
  app?: CardinalApp

  @IsObject()
  settings: SettingsObject = {}
}
