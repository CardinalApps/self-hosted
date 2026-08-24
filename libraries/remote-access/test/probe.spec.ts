import {
  test,
  expect,
  describe,
  beforeAll,
} from '@jest/globals'

import {
  signProbeHeader,
  verifyProbeHeader,
  PROBE_TIMESTAMP_SKEW_SECONDS,
} from '../src'

// Helpers
const KEY_BYTES = 32

function freshKey(): Uint8Array {
  const k = new Uint8Array(KEY_BYTES)
  crypto.getRandomValues(k)
  return k
}

function randomInstanceId(): string {
  return crypto.randomUUID()
}

const k1 = freshKey()
const k2 = freshKey()
const id1 = randomInstanceId()
const id2 = randomInstanceId()
const now = new Date('2026-05-18T12:00:00.000Z')

beforeAll(() => {
  // Sanity: the global crypto.subtle must be present for these tests to be meaningful.
  expect(typeof crypto.subtle?.sign).toBe('function')
})

describe('signProbeHeader', () => {
  test('returns a "timestamp:base64hmac" string', async () => {
    const header = await signProbeHeader(k1, id1, now)
    expect(header).toMatch(/^\d+:[A-Za-z0-9+/=]+$/)
    const [ts, sig] = header.split(':')
    expect(parseInt(ts, 10)).toBe(Math.floor(now.getTime() / 1000))
    // SHA-256 → 32 bytes → 44 base64 chars (padded).
    expect(atob(sig).length).toBe(32)
  })

  test('throws when signingKey is not 32 bytes', async () => {
    await expect(signProbeHeader(new Uint8Array(16), id1, now)).rejects.toThrow()
    await expect(signProbeHeader(new Uint8Array(64), id1, now)).rejects.toThrow()
    await expect(signProbeHeader(new Uint8Array(0), id1, now)).rejects.toThrow()
  })
})

describe('verifyProbeHeader — happy path', () => {
  test('verifies a header just produced by signProbeHeader', async () => {
    const header = await signProbeHeader(k1, id1, now)
    expect(await verifyProbeHeader(k1, id1, header, now)).toBe(true)
  })

  test('property-test: round-trips for 50 random (key, id, now) triples', async () => {
    for (let i = 0; i < 50; i++) {
      const k = freshKey()
      const id = randomInstanceId()
      const ts = new Date(Date.UTC(2020 + (i % 10), i % 12, 1 + (i % 27), i % 24, i % 60, i % 60))
      const header = await signProbeHeader(k, id, ts)
      expect(await verifyProbeHeader(k, id, header, ts)).toBe(true)
    }
  })
})

describe('verifyProbeHeader — failure cases', () => {
  test('wrong key → false', async () => {
    const header = await signProbeHeader(k1, id1, now)
    expect(await verifyProbeHeader(k2, id1, header, now)).toBe(false)
  })

  test('wrong instanceId → false', async () => {
    const header = await signProbeHeader(k1, id1, now)
    expect(await verifyProbeHeader(k1, id2, header, now)).toBe(false)
  })

  test('tampered HMAC suffix → false', async () => {
    const header = await signProbeHeader(k1, id1, now)
    const [ts, sig] = header.split(':')
    // Flip one bit of the decoded HMAC and re-encode.
    const sigBytes = Uint8Array.from(atob(sig), (c) => c.charCodeAt(0))
    sigBytes[0] ^= 0x01
    const tamperedSig = btoa(String.fromCharCode(...sigBytes))
    expect(await verifyProbeHeader(k1, id1, `${ts}:${tamperedSig}`, now)).toBe(false)
  })

  test('tampered timestamp → false (HMAC no longer matches)', async () => {
    const header = await signProbeHeader(k1, id1, now)
    const [ts, sig] = header.split(':')
    const tamperedTs = parseInt(ts, 10) + 1
    expect(await verifyProbeHeader(k1, id1, `${tamperedTs}:${sig}`, now)).toBe(false)
  })
})

describe('verifyProbeHeader — timestamp skew', () => {
  test('expired (>300s old) → false', async () => {
    const signedAt = new Date(now.getTime() - (PROBE_TIMESTAMP_SKEW_SECONDS + 1) * 1000)
    const header = await signProbeHeader(k1, id1, signedAt)
    expect(await verifyProbeHeader(k1, id1, header, now)).toBe(false)
  })

  test('too far in the future (>300s) → false', async () => {
    const signedAt = new Date(now.getTime() + (PROBE_TIMESTAMP_SKEW_SECONDS + 1) * 1000)
    const header = await signProbeHeader(k1, id1, signedAt)
    expect(await verifyProbeHeader(k1, id1, header, now)).toBe(false)
  })

  test('within ±299s → true', async () => {
    const signedAt1 = new Date(now.getTime() - 299 * 1000)
    const h1 = await signProbeHeader(k1, id1, signedAt1)
    expect(await verifyProbeHeader(k1, id1, h1, now)).toBe(true)

    const signedAt2 = new Date(now.getTime() + 299 * 1000)
    const h2 = await signProbeHeader(k1, id1, signedAt2)
    expect(await verifyProbeHeader(k1, id1, h2, now)).toBe(true)
  })

  test('exactly at boundary (300s old) → true', async () => {
    const signedAt = new Date(now.getTime() - PROBE_TIMESTAMP_SKEW_SECONDS * 1000)
    const header = await signProbeHeader(k1, id1, signedAt)
    expect(await verifyProbeHeader(k1, id1, header, now)).toBe(true)
  })
})

describe('verifyProbeHeader — malformed input never throws', () => {
  const malformed: unknown[] = [
    '',
    'abc',
    ':',
    '123:',
    ':abc',
    '123:not-base64!',
    '-1:AAAA',
    'abc:AAAA',
    '1.5:AAAA',
    '1e3:AAAA',
    'a'.repeat(10000),
    null,
    undefined,
    42,
    {},
    [],
    Symbol('x') as unknown,
  ]

  test.each(malformed.map((v) => [String(typeof v) + ':' + String(v).slice(0, 30), v]))(
    '%s → false (no throw)',
    async (_label, value) => {
      // Defensive: the public signature is `string`, but callers may pass garbage
      // at runtime. Verify must never throw.
      let result: boolean
      try {
        result = await verifyProbeHeader(k1, id1, value as string, now)
      } catch (e) {
        throw new Error(`verifyProbeHeader threw on ${String(value)}: ${(e as Error).message}`)
      }
      expect(result).toBe(false)
    },
  )

  test('signature with wrong byte length → false', async () => {
    const header = await signProbeHeader(k1, id1, now)
    const [ts] = header.split(':')
    // 16 zero bytes — base64 valid, but not the right length for SHA-256.
    const tooShortSig = btoa(String.fromCharCode(...new Uint8Array(16)))
    expect(await verifyProbeHeader(k1, id1, `${ts}:${tooShortSig}`, now)).toBe(false)
  })
})

describe('verifyProbeHeader — defensive on bad key', () => {
  test('non-32-byte key → false (does not throw)', async () => {
    const header = await signProbeHeader(k1, id1, now)
    expect(await verifyProbeHeader(new Uint8Array(16), id1, header, now)).toBe(false)
    expect(await verifyProbeHeader(new Uint8Array(0), id1, header, now)).toBe(false)
  })
})
