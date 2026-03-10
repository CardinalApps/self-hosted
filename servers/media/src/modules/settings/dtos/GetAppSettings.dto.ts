import { IsString } from 'class-validator'

import { CardinalApp } from '../../../utils/apps'

export class GetAppSettings {
  @IsString()
  app: CardinalApp
}
