import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'

/*
 * Only the shape is checked here. Whether a name is well formed, reserved or taken is the Remote
 * Access Server's answer to give, and it gives it with codes this server does not second-guess.
 */
export class VanityNameQueryDto {
  @ApiProperty({ description: 'The vanity label, without any domain suffix.' })
  @IsString()
  @IsNotEmpty()
  name: string
}

export class SetVanityNameDto {
  @ApiProperty({ description: 'The vanity label to claim for this server, without any domain suffix.' })
  @IsString()
  @IsNotEmpty()
  name: string
}
