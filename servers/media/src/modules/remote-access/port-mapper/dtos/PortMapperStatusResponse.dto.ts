import { ApiProperty } from '@nestjs/swagger'

import { PortMapperState } from '../port-mapper.types'

export class PortMapperStatusResponse {
  @ApiProperty({ enum: ['disabled', 'not_attempted', 'active', 'failed'] })
  state: PortMapperState

  @ApiProperty({ required: false, description: 'Why the mapping failed. Only present when the state is failed.' })
  reason?: string

  @ApiProperty({ required: false, nullable: true, description: 'The router-reported external IP. Only present when the state is active.' })
  externalIp?: string | null

  @ApiProperty({ required: false, description: 'Only present when the state is active.' })
  externalPort?: number

  @ApiProperty({ required: false, description: 'Only present when the state is active.' })
  internalPort?: number

  @ApiProperty({ required: false, description: 'ISO timestamp. Only present when the state is active.' })
  leaseExpiresAt?: string

  @ApiProperty({ required: false, description: 'ISO timestamp. Only present when the state is failed.' })
  lastAttemptAt?: string
}
