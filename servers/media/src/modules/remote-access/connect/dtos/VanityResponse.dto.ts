import { ApiProperty } from '@nestjs/swagger'

export class VanityStatusResponse {
  @ApiProperty({ type: [String], description: 'Every vanity label this server currently holds.' })
  labels: string[]

  @ApiProperty({ nullable: true, description: 'The label clients are pointed at, when one is set.' })
  primary: string | null

  @ApiProperty({
    enum: ['pending', 'live', 'failed'],
    nullable: true,
    description: 'Where the certificate covering the labels stands. `pending` means the name is claimed but not yet on a certificate.',
  })
  state: string | null
}

export class VanityAvailabilityResponse {
  @ApiProperty({ description: 'The normalized label the answer is about.' })
  name: string

  @ApiProperty({ description: 'Whether this server could claim the label right now.' })
  available: boolean

  @ApiProperty({ required: false, description: 'Why not, when unavailable. Never says more than `name_unavailable`.' })
  reason?: string
}
