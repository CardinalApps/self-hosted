import { PROBE_TIMESTAMP_SKEW_SECONDS } from './constants'

const HMAC_KEY_BYTES = 32
const HMAC_OUTPUT_BYTES = 32

// HMAC-SHA256 the probe payload `${instanceId}:${tsSec}` and return `${tsSec}:${base64(hmac)}`.
export async function signProbeHeader(
  signingKey: Uint8Array,
  instanceId: string,
  now: Date,
): Promise<string> {
  if (!(signingKey instanceof Uint8Array) || signingKey.length !== HMAC_KEY_BYTES) {
    throw new RangeError(
      `signProbeHeader: signingKey must be ${HMAC_KEY_BYTES} bytes (got ${signingKey?.length ?? 'non-Uint8Array'})`,
    )
  }
  if (Number.isNaN(now.getTime())) {
    throw new RangeError('signProbeHeader: now must be a valid Date')
  }

  const tsSec = Math.floor(now.getTime() / 1000)
  const payload = encodePayload(instanceId, tsSec)
  const key = await importHmacKey(signingKey, ['sign'])
  const sigBuf = await crypto.subtle.sign('HMAC', key, payload)
  return `${tsSec}:${bytesToBase64(new Uint8Array(sigBuf))}`
}

// Verify a probe header. Returns `false` for any failure — wrong key, wrong instance, expired timestamp, malformed input, etc. Never throws.
export async function verifyProbeHeader(
  signingKey: Uint8Array,
  instanceId: string,
  headerValue: string,
  now: Date,
): Promise<boolean> {
  if (!(signingKey instanceof Uint8Array) || signingKey.length !== HMAC_KEY_BYTES) return false
  if (typeof instanceId !== 'string') return false
  if (typeof headerValue !== 'string') return false
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) return false

  const colon = headerValue.indexOf(':')
  if (colon <= 0 || colon === headerValue.length - 1) return false

  const tsStr = headerValue.slice(0, colon)
  const sigB64 = headerValue.slice(colon + 1)

  if (!/^\d+$/.test(tsStr)) return false
  const tsSec = Number.parseInt(tsStr, 10)
  if (!Number.isSafeInteger(tsSec) || tsSec < 0) return false

  const nowSec = Math.floor(now.getTime() / 1000)
  if (Math.abs(nowSec - tsSec) > PROBE_TIMESTAMP_SKEW_SECONDS) return false

  let sigBytes: Uint8Array<ArrayBuffer>
  try {
    sigBytes = base64ToBytes(sigB64)
  } catch {
    return false
  }
  if (sigBytes.length !== HMAC_OUTPUT_BYTES) return false

  try {
    const payload = encodePayload(instanceId, tsSec)
    const key = await importHmacKey(signingKey, ['verify'])
    // crypto.subtle.verify is required by spec to use constant-time comparison.
    return await crypto.subtle.verify('HMAC', key, sigBytes, payload)
  } catch {
    return false
  }
}

const encoder = new TextEncoder()

// Build the bytes signed by the probe HMAC. Returned buffer is always plain ArrayBuffer-backed (BufferSource-compatible across DOM/Node lib type drift).
function encodePayload(instanceId: string, tsSec: number): Uint8Array<ArrayBuffer> {
  return toFreshBuffer(encoder.encode(`${instanceId}:${tsSec}`))
}

// Import a raw HMAC-SHA256 key for use with crypto.subtle.
function importHmacKey(rawKey: Uint8Array, usages: KeyUsage[]): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', toFreshBuffer(rawKey), { name: 'HMAC', hash: 'SHA-256' }, false, usages)
}

// Copy any Uint8Array into a fresh ArrayBuffer-backed view so the result is BufferSource-compatible under TS 5.x's stricter typed-array generics.
function toFreshBuffer(src: Uint8Array): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(src.length)
  out.set(src)
  return out
}

// Encode raw bytes as base64 using only globally-available primitives (btoa).
function bytesToBase64(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return btoa(s)
}

// Decode base64 to bytes. Rejects strings that aren't strict canonical base64 — atob is permissive on some platforms.
function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(b64) || b64.length % 4 !== 0) {
    throw new Error('invalid base64')
  }
  const s = atob(b64)
  const bytes = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i)
  return bytes
}
