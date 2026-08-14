import { ApiProperty } from '@nestjs/swagger'
import { IsBoolean, IsOptional } from 'class-validator'

export class UpdateConnectSettingsDto {
  @ApiProperty({ required: false, description: 'Whether clients may connect straight to this server. Turning it off stops the Remote Access HTTPS listener.' })
  @IsOptional()
  @IsBoolean()
  directEnabled?: boolean

  @ApiProperty({ required: false, description: "Whether clients may reach this server through Cardinal's metered relay." })
  @IsOptional()
  @IsBoolean()
  relayEnabled?: boolean
}
