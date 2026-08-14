import type { Client } from 'nat-upnp'

export type PortMapperFailureReason = 'port_conflict' | 'no_gateway' | 'docker_bridge' | 'unknown'

export type PortMapperState = 'disabled' | 'not_attempted' | 'active' | 'failed'

export type PortMapperStatus =
  | { state: 'disabled' }
  | { state: 'not_attempted' }
  | { state: 'active', externalIp: string | null, externalPort: number, internalPort: number, leaseExpiresAt: Date }
  | { state: 'failed', reason: PortMapperFailureReason, lastAttemptAt: Date }

// The subset of the `nat-upnp` client the service uses; injectable so tests
// can supply a fake
export type UpnpClient = Pick<Client, 'portMapping' | 'portUnmapping' | 'externalIp' | 'close'>
export type UpnpClientFactory = () => UpnpClient
export const UPNP_CLIENT_FACTORY = 'UPNP_CLIENT_FACTORY'
