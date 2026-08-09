import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'

export class AddCorsOriginDto {
  @ApiProperty({
    description: 'The origin to allow, as a well-formed http:// or https:// URL. Only the scheme, host, and port are kept.',
    example: 'https://birdhouse.example.com:8123',
  })
  @IsString()
  @IsNotEmpty()
  origin: string
}
