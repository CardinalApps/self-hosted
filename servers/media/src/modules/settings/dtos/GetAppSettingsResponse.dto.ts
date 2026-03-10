import { IsObject } from 'class-validator'

import { SettingsObject } from '../types'

export class GetAppSettingsResponse {
  @IsObject()
  settings: SettingsObject = {}
}
