import { Transform } from 'class-transformer'
import { IsString, IsBoolean, IsOptional } from 'class-validator'

export class ServerSetupDto {
  @Transform(({ value }) => String(value))
  @IsOptional()
  @IsString()
  theme?: string

  @Transform(({ value }) => String(value))
  @IsOptional()
  @IsString()
  serverName?: string

  @Transform(({ value }) => Boolean(value))
  @IsBoolean()
  sendAnonymousUsageData?: boolean

  @Transform(({ value }) => String(value))
  @IsOptional()
  @IsString()
  ssoToken?: string
}
