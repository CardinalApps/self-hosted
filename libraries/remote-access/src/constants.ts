// Header names and message-type strings travel over the network — they must
// stay stable. Bumping any of them is a wire-protocol break and requires a
// bump to PROTOCOL_VERSION below.

export const HEADERS = {
  PROBE: 'X-Cardinal-Probe',
  PROBE_SIGNATURE: 'X-Cardinal-Probe-Signature',
  PROBE_PONG: 'X-Cardinal-Probe-Pong',
  CONNECTION: 'X-Cardinal-Connection',
  // Set by the relay on forwarded requests to carry the original client IP.
  // The relay overwrites any client-supplied value, so it cannot be spoofed.
  CLIENT_IP: 'X-Cardinal-Client-IP',
} as const

export const MESSAGE_TYPES = {
  // Media Server → Remote Access Server
  REGISTER: 'register',
  PING: 'ping',
  RELAY_HTTP_RESPONSE_START: 'relay:http:response:start',
  RELAY_HTTP_RESPONSE_END: 'relay:http:response:end',

  // Remote Access Server → Media Server
  REGISTERED: 'registered',
  PONG: 'pong',
  CONFIG_UPDATE: 'config:update',
  CERT_UPDATE: 'cert:update',
  RELAY_HTTP_REQUEST: 'relay:http:request',
  // Signals end-of-request-body so the Media Server knows to close its synthesized IncomingMessage. Sent after the controller has piped the entire request body as binary frames. Forward-compat addition: older Media Servers will ignore unknown JSON message types.
  RELAY_HTTP_REQUEST_END: 'relay:http:request:end',

  // Either direction
  RELAY_ABORT: 'relay:abort',
} as const

export const DEFAULT_MEDIA_SERVER_PORT = 24900

export const WSS_PATH = '/connect'

// WSS close codes (design §8). Numbers in the 4000-4999 range are reserved
// for application-defined codes.
export const WSS_CLOSE_SUPERSEDED = 4000
export const WSS_CLOSE_FORBIDDEN = 4001
export const WSS_CLOSE_PING_TIMEOUT = 4002

// Max clock skew accepted on probe-header timestamps (design §9 step 2).
export const PROBE_TIMESTAMP_SKEW_SECONDS = 5 * 60

// Max body size for the probe-signed diagnostic echo endpoint.
export const ECHO_MAX_BYTES = 1024 * 1024

export const PROTOCOL_VERSION = 1
