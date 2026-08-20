// Wire-protocol types for the Remote Access service. The discriminated unions
// for control messages mirror design §8; field names must match exactly.

export type InstanceId = string
export type AccountId = string

/*
 * One direct-dial attempt: an IP-encoded hostname (`192-168-1-40.<instanceId>.<suffix>`, dashed-v6
 * for AAAA) that TLS-validates against the server's own certificate. Clients walk candidates in
 * order — LAN entries come first — and fall back to the relay.
 */
export interface ConnectionCandidate {
  kind: 'lan' | 'wan'
  hostname: string
  port: number
}

// Negotiation API: GET https://api.cardinalapps.host/connect/:instanceId
export interface ConnectionInfo {
  online: boolean
  // Legacy single direct target; stays populated until clients consume `candidates`.
  direct?: {
    hostname: string
    port: number
  }
  candidates: ConnectionCandidate[]
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

/*
 * Server-assigned settings carried in `registered`. Open-ended like ConfigUpdatePayload so new keys
 * don't need a protocol-version bump. `relayHostname` is the relay endpoint this deployment actually
 * serves, which lets Media Servers display it instead of their compiled-in default.
 *
 * `verifiedExternalPort` is the port a reachability probe proved this server answers on from the
 * internet, when that is not the port it advertised — today only 443, which is what lets the direct
 * URL drop its port. It is always present in `registered`, so a fresh register is authoritative;
 * null means no such proof exists and the advertised port stands.
 */
export interface RegisteredConfig {
  relayHostname?: string
  verifiedExternalPort?: number | null
  [key: string]: unknown
}

// Payload of a successful `registered` message (design §8).
export interface RegisteredPayload {
  publicIp: string
  hostname: string
  signingKey: string
  cert?: CertPayload
  config: RegisteredConfig
}

/*
 * Payload of a `config:update` message. The shape is intentionally open so new keys can be added
 * without a protocol-version bump. Absent keys mean "unchanged"; `verifiedExternalPort` uses an
 * explicit null to retract a verdict, so absence and retraction stay distinguishable.
 */
export interface ConfigUpdatePayload {
  signingKey?: string
  relayHostname?: string
  verifiedExternalPort?: number | null
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

/*
 * Messages the Media Server sends to the Remote Access Server. `byoHostname` is set only when the
 * user supplies their own domain. `directEnabled`/`relayEnabled` carry the server owner's per-path
 * opt-out; both are absent on Media Servers predating the setting, which means enabled.
 */
export type MediaToServerMessage =
  | {
      type: 'register'
      instanceId: InstanceId
      publicPort: number
      localIps: string[]
      version: string
      byoHostname?: string
      directEnabled?: boolean
      relayEnabled?: boolean
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
