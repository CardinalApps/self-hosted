// Wire format for relay-protocol body chunks (design §10):
//   [u32 BE — requestId UTF-8 byte length] [requestId bytes] [chunk bytes]
//
// Encoded and decoded on both sides of the relay so the Remote Access Server
// can multiplex concurrent requests over a single WSS connection.

const PREFIX_BYTES = 4
const MAX_ID_BYTES = 0xffffffff

const encoder = new TextEncoder()
const decoder = new TextDecoder('utf-8', { fatal: false })

// Pack (requestId, chunk) into a single binary frame.
export function encodeRelayBinaryFrame(requestId: string, chunk: Uint8Array): Uint8Array<ArrayBuffer> {
  const idBytes = encoder.encode(requestId)
  if (idBytes.length > MAX_ID_BYTES) {
    throw new RangeError(`encodeRelayBinaryFrame: requestId UTF-8 length exceeds uint32 (${idBytes.length})`)
  }

  const frame = new Uint8Array(PREFIX_BYTES + idBytes.length + chunk.length)
  // Big-endian u32 prefix.
  new DataView(frame.buffer).setUint32(0, idBytes.length, false)
  frame.set(idBytes, PREFIX_BYTES)
  frame.set(chunk, PREFIX_BYTES + idBytes.length)
  return frame
}

// Unpack a binary frame into { requestId, chunk }. Throws RangeError on truncation.
export function decodeRelayBinaryFrame(frame: Uint8Array): { requestId: string; chunk: Uint8Array<ArrayBuffer> } {
  if (frame.byteLength < PREFIX_BYTES) {
    throw new RangeError(`decodeRelayBinaryFrame: frame too short (${frame.byteLength} bytes, need >= ${PREFIX_BYTES})`)
  }

  // DataView respects the byteOffset of a subarray, so a non-zero-offset frame works.
  const view = new DataView(frame.buffer, frame.byteOffset, frame.byteLength)
  const idLength = view.getUint32(0, false)

  if (idLength > frame.byteLength - PREFIX_BYTES) {
    throw new RangeError(`decodeRelayBinaryFrame: prefix declares ${idLength} id bytes but only ${frame.byteLength - PREFIX_BYTES} body bytes available`)
  }

  // .slice copies so the returned chunk owns its bytes — caller mutations of `frame` won't bleed in.
  const idEnd = PREFIX_BYTES + idLength
  const requestId = decoder.decode(frame.slice(PREFIX_BYTES, idEnd))
  const chunk = frame.slice(idEnd)
  return { requestId, chunk }
}
