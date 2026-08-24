import {
  test,
  expect,
  describe,
} from '@jest/globals'

import {
  encodeRelayBinaryFrame,
  decodeRelayBinaryFrame,
} from '../src'

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

// crypto.getRandomValues is hard-capped at 65,536 bytes per call by the Web Crypto spec.
// We don't need cryptographic randomness for codec round-trip tests — a deterministic
// pattern with enough variety to catch byte-order mistakes is sufficient.
function patternChunk(size: number): Uint8Array {
  const buf = new Uint8Array(size)
  for (let i = 0; i < size; i++) buf[i] = (i * 31 + 7) & 0xff
  return buf
}

describe('encodeRelayBinaryFrame', () => {
  // Wire format: [u32 BE id length] [id UTF-8] [chunk]
  test('writes the exact wire layout for a short ASCII id and chunk', () => {
    const frame = encodeRelayBinaryFrame('ab', new Uint8Array([0x11]))
    // [u32 BE length=2] [id "ab"] [chunk 0x11]
    expect(Array.from(frame)).toEqual([0x00, 0x00, 0x00, 0x02, 0x61, 0x62, 0x11])
  })

  test('writes a 4-byte zero prefix when requestId is empty', () => {
    const frame = encodeRelayBinaryFrame('', new Uint8Array([0xff, 0xee]))
    expect(Array.from(frame.slice(0, 4))).toEqual([0x00, 0x00, 0x00, 0x00])
    expect(Array.from(frame.slice(4))).toEqual([0xff, 0xee])
  })

  test('supports an empty chunk', () => {
    const frame = encodeRelayBinaryFrame('id', new Uint8Array(0))
    expect(frame.length).toBe(4 + 2)
    expect(Array.from(frame)).toEqual([0x00, 0x00, 0x00, 0x02, 0x69, 0x64])
  })

  test('returns a plain Uint8Array (browser-safe — not a Node Buffer)', () => {
    const frame = encodeRelayBinaryFrame('id', new Uint8Array([1, 2, 3]))
    // Buffer extends Uint8Array; we want the bare Uint8Array constructor.
    expect(frame.constructor.name).toBe('Uint8Array')
  })
})

describe('decodeRelayBinaryFrame', () => {
  test('round-trips a basic frame', () => {
    const id = 'request-123'
    const chunk = new Uint8Array([0xde, 0xad, 0xbe, 0xef])
    const { requestId, chunk: decoded } = decodeRelayBinaryFrame(encodeRelayBinaryFrame(id, chunk))
    expect(requestId).toBe(id)
    expect(bytesEqual(decoded, chunk)).toBe(true)
  })

  test('round-trips a UTF-8 multibyte requestId', () => {
    const id = '🦊✓αβγ'
    const chunk = new Uint8Array([1, 2, 3])
    const { requestId, chunk: decoded } = decodeRelayBinaryFrame(encodeRelayBinaryFrame(id, chunk))
    expect(requestId).toBe(id)
    expect(bytesEqual(decoded, chunk)).toBe(true)
  })

  test('returns an empty chunk when the frame body is empty', () => {
    const { requestId, chunk } = decodeRelayBinaryFrame(encodeRelayBinaryFrame('id', new Uint8Array(0)))
    expect(requestId).toBe('id')
    expect(chunk.length).toBe(0)
  })

  test('property-test: round-trips 100 random (id, chunk) pairs', () => {
    for (let i = 0; i < 100; i++) {
      const id = `req-${i}-${crypto.randomUUID()}`
      const chunk = patternChunk(1 + (i * 7) % 4096)
      const { requestId, chunk: decoded } = decodeRelayBinaryFrame(encodeRelayBinaryFrame(id, chunk))
      expect(requestId).toBe(id)
      expect(bytesEqual(decoded, chunk)).toBe(true)
    }
  })

  test('round-trips a ~5MB chunk', () => {
    const id = 'big'
    const chunk = patternChunk(5 * 1024 * 1024)
    const frame = encodeRelayBinaryFrame(id, chunk)
    const { requestId, chunk: decoded } = decodeRelayBinaryFrame(frame)
    expect(requestId).toBe(id)
    expect(decoded.length).toBe(chunk.length)
    // Spot-check head and tail rather than O(N) compare in the assertion message.
    expect(decoded[0]).toBe(chunk[0])
    expect(decoded[decoded.length - 1]).toBe(chunk[chunk.length - 1])
    expect(bytesEqual(decoded.subarray(0, 1024), chunk.subarray(0, 1024))).toBe(true)
  })

  test('decoded chunk is isolated from later mutations of the input frame', () => {
    const id = 'iso'
    const chunk = new Uint8Array([0xaa, 0xbb, 0xcc])
    const frame = encodeRelayBinaryFrame(id, chunk)
    const { chunk: decoded } = decodeRelayBinaryFrame(frame)
    // Tamper with the chunk region of the original frame.
    frame[frame.length - 1] = 0x00
    frame[frame.length - 2] = 0x00
    expect(decoded[decoded.length - 1]).toBe(0xcc)
    expect(decoded[decoded.length - 2]).toBe(0xbb)
  })

  test('handles a sliced (non-zero byteOffset) frame', () => {
    const id = 'sliced'
    const chunk = new Uint8Array([9, 8, 7, 6, 5])
    const frame = encodeRelayBinaryFrame(id, chunk)
    // Wrap the frame inside a larger buffer with garbage in front.
    const wrapper = new Uint8Array(5 + frame.length)
    wrapper.set([0xaa, 0xbb, 0xcc, 0xdd, 0xee], 0)
    wrapper.set(frame, 5)
    const sliced = wrapper.subarray(5)
    const { requestId, chunk: decoded } = decodeRelayBinaryFrame(sliced)
    expect(requestId).toBe(id)
    expect(bytesEqual(decoded, chunk)).toBe(true)
  })
})

describe('decodeRelayBinaryFrame — error cases', () => {
  test('throws RangeError when frame is shorter than the 4-byte prefix', () => {
    expect(() => decodeRelayBinaryFrame(new Uint8Array(0))).toThrow(RangeError)
    expect(() => decodeRelayBinaryFrame(new Uint8Array([0x00]))).toThrow(RangeError)
    expect(() => decodeRelayBinaryFrame(new Uint8Array([0x00, 0x00, 0x00]))).toThrow(RangeError)
  })

  test('throws RangeError when the prefix declares more id bytes than the frame holds', () => {
    // Declares 10 bytes of requestId but the frame only has 6 bytes total (4 prefix + 2 body).
    const bogus = new Uint8Array([0x00, 0x00, 0x00, 0x0a, 0x61, 0x62])
    expect(() => decodeRelayBinaryFrame(bogus)).toThrow(RangeError)
  })

  test('does not throw at the boundary where id length exactly equals body length', () => {
    // Prefix says 2 bytes of id, frame body is exactly 2 bytes, chunk is empty.
    const exact = new Uint8Array([0x00, 0x00, 0x00, 0x02, 0x61, 0x62])
    const { requestId, chunk } = decodeRelayBinaryFrame(exact)
    expect(requestId).toBe('ab')
    expect(chunk.length).toBe(0)
  })
})
