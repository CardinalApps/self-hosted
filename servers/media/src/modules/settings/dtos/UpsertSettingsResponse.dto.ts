import { IsObject } from 'class-validator'

export class UpsertSettingsResponse {
  @IsObject()
  updated?: object = {}
}
