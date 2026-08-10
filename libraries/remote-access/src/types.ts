// Wire-protocol types for the Remote Access service. The discriminated unions
// for control messages mirror design §8; field names must match exactly.

export type InstanceId = string
export type AccountId = string

// Negotiation API: GET https://api.cardinalapps.host/connect/:instanceId
export interface ConnectionInfo {
  online: boolean
  direct?: {
    hostname: string
    port: number
  }
  relay: {
    url: string
    enabled: boolean
  }
}

// Cert material pushed over WSS to Media Servers on a Cardinal-managed hostname (not BYO-domain installs).
export interface CertPayload {
  cert_pem: string
  key_pem: string
  not_after: string
}

// Payload of a successful `registered` message (design §8).
export interface RegisteredPayload {
  publicIp: string
  hostname: string
  signingKey: string
  cert?: CertPayload
  config: Record<string, unknown>
}

// Payload of a `config:update` message. The shape is intentionally open so
// new keys can be added without a protocol-version bump.
export interface ConfigUpdatePayload {
  signingKey?: string
  [key: string]: unknown
}

export interface CertUpdatePayload {
  cert_pem: string
  key_pem: string
}

export interface RelayHttpRequest {
  requestId: string
  method: string
  path: string
  headers: Record<string, string>
}

// Signals end-of-request-body so the Media Server can close its synthesized
// IncomingMessage.
export interface RelayHttpRequestEnd {
  requestId: string
}

export interface RelayHttpResponseStart {
  requestId: string
  status: number
  // Numbers and string arrays (set-cookie) survive the trip; the relay
  // sanitizes before writing them to the client response
  headers: Record<string, string | number | string[]>
}

export interface RelayHttpResponseEnd {
  requestId: string
  totalBytes: number
}

export interface RelayAbort {
  requestId: string
  reason: string
}

// Messages the Media Server sends to the Remote Access Server. `byoHostname` is set only when the user supplies their own domain.
export type MediaToServerMessage =
  | {
      type: 'register'
      instanceId: InstanceId
      publicPort: number
      localIps: string[]
      version: string
      byoHostname?: string
    }
  | { type: 'ping' }
  | ({ type: 'relay:http:response:start' } & RelayHttpResponseStart)
  | ({ type: 'relay:http:response:end' } & RelayHttpResponseEnd)
  | ({ type: 'relay:abort' } & RelayAbort)

// Messages the Remote Access Server sends to the Media Server.
export type ServerToMediaMessage =
  | ({ type: 'registered' } & RegisteredPayload)
  | { type: 'pong' }
  | ({ type: 'config:update' } & ConfigUpdatePayload)
  | ({ type: 'cert:update' } & CertUpdatePayload)
  | ({ type: 'relay:http:request' } & RelayHttpRequest)
  | ({ type: 'relay:http:request:end' } & RelayHttpRequestEnd)
  | ({ type: 'relay:abort' } & RelayAbort)
