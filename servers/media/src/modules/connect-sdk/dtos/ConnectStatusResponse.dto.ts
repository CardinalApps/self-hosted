import { ApiProperty } from '@nestjs/swagger'

export class ConnectStatusResponse {
  @ApiProperty({ description: 'Whether Remote Access is enabled on this server.' })
  enabled: boolean

  @ApiProperty({ enum: ['disconnected', 'connecting', 'connected', 'auth_failed'], description: 'Live state of the control channel to the Remote Access Server.' })
  state: string

  @ApiProperty({ nullable: true, description: 'The hostname assigned by the Remote Access Server, once registered.' })
  hostname: string | null

  @ApiProperty({ nullable: true, description: 'Truncated SHA-256 fingerprint of the probe signing key, for support diagnostics.' })
  signingKeyFingerprint: string | null

  @ApiProperty({ nullable: true, description: 'Expiry of the stored cloud credential, ISO 8601.' })
  tokenExpiresAt: string | null
}
