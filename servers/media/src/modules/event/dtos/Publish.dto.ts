import { IsString, IsObject, IsOptional } from 'class-validator'

export class PublishDto {
  @IsString()
  type: string

  @IsObject()
  @IsOptional()
  payload?: Record<string, unknown> = undefined
}
