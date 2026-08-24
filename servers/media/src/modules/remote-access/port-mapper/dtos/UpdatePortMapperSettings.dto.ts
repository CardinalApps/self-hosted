import { ApiProperty } from '@nestjs/swagger'
import { IsBoolean } from 'class-validator'

export class UpdatePortMapperSettingsDto {
  @ApiProperty({ description: 'Whether to automatically forward the Remote Access port with UPnP. Only works with host networking.' })
  @IsBoolean()
  enabled: boolean
}
