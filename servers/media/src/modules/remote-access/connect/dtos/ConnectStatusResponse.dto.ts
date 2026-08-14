import { ApiProperty } from '@nestjs/swagger'

export class ConnectHttpsStatus {
  @ApiProperty({ enum: ['stopped', 'running', 'error'], description: 'State of the Remote Access HTTPS listener, which serves direct connections.' })
  state: string

  @ApiProperty({ nullable: true, description: 'The port the listener is bound to, once running.' })
  port: number | null

  @ApiProperty({ nullable: true, description: 'Expiry of the TLS certificate in use, ISO 8601.' })
  certExpiresAt: string | null

  @ApiProperty({ nullable: true, description: 'Why the listener could not start or why cert material was rejected.' })
  lastError: string | null
}

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

  @ApiProperty({ nullable: true, description: 'The externally reachable port advertised to the Remote Access Server.' })
  publicPort: number | null

  @ApiProperty({ nullable: true, description: 'The URL clients use to reach this server directly. Null until a hostname is assigned.' })
  directUrl: string | null

  @ApiProperty({ nullable: true, description: 'The URL clients use to reach this server through the relay.' })
  relayUrl: string | null

  @ApiProperty({ type: ConnectHttpsStatus, description: 'State of the listener that answers direct connections.' })
  https: ConnectHttpsStatus
}
