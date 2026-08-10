import * as http from 'http'
import { Readable } from 'stream'
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common'
import { HEADERS } from '@cardinalapps/remote-access/dist/cjs'

import { ConnectSDKService } from '../connect/connect-sdk.service'
import { ConnectSDKEvents } from '../connect/connect-sdk.events'

/* Defensive per-Media-Server ceiling. The Remote Access Server already
   enforces per-account limits; this protects the Media Server itself from a
   misbehaving relay. */
export const MEDIA_MAX_INFLIGHT_RELAY = 50

const CLIENT_IP_HEADER = HEADERS.CLIENT_IP.toLowerCase()

type RelayEntry = {
  req: RelayIncomingMessage,
  res: RelayServerResponse,
}

/**
 * Dispatches relayed HTTP requests through the local Express stack. Each
 * `relay:http:request` becomes a synthetic IncomingMessage/ServerResponse
 * pair: request body bytes arrive as binary frames and are pushed into the
 * request stream; the response is streamed back as control messages plus
 * binary frames keyed by requestId.
 */
@Injectable()
export class RelayRequestHandler implements OnApplicationBootstrap {
  private expressApp: ((req: http.IncomingMessage, res: http.ServerResponse) => void) | null = null
  private readonly inFlight = new Map<string, RelayEntry>()

  constructor(
    private readonly connectSDKService: ConnectSDKService,
    private readonly events: ConnectSDKEvents,
  ) {}

  /**
   * Subscribes to the relay events fanned out by the ConnectSDK.
   */
  onApplicationBootstrap(): void {
    this.events.on('relay:http:request', (message) => this.handle(message.requestId, message))
    this.events.on('binary:frame', ({ requestId, chunk }) => this.feedBinary(requestId, chunk))
    this.events.on('relay:http:request:end', ({ requestId }) => this.feedEnd(requestId))
    this.events.on('relay:abort', ({ requestId, reason }) => this.abort(requestId, reason))
  }

  /**
   * Receives the app's Express instance from the bootstrap code. Requests
   * relayed before this is called are answered with a 503.
   */
  attach(expressApp: (req: http.IncomingMessage, res: http.ServerResponse) => void): void {
    this.expressApp = expressApp
  }

  /**
   * Returns the number of relayed requests currently being processed.
   */
  getInFlightCount(): number {
    return this.inFlight.size
  }

  /**
   * Dispatches one relayed request through Express.
   */
  handle(requestId: string, params: { method: string, path: string, headers: Record<string, string | string[]> }): void {
    if (!this.expressApp || this.inFlight.size >= MEDIA_MAX_INFLIGHT_RELAY) {
      this.reject(requestId, 503)
      return
    }

    const headers = normalizeHeaders(params.headers)

    /* The relay asserts the original client IP in its own trusted header;
       express middlewares expect the conventional one */
    if (typeof headers[CLIENT_IP_HEADER] === 'string') {
      headers['x-forwarded-for'] = headers[CLIENT_IP_HEADER]
    }

    const req = new RelayIncomingMessage(params.method, params.path, headers)

    const res = new RelayServerResponse(req, {
      start: (status, responseHeaders) => {
        this.connectSDKService.sendRelayMessage({
          type: 'relay:http:response:start',
          requestId,
          status,
          headers: serializeHeaders(responseHeaders),
        })
      },
      chunk: (data) => {
        this.connectSDKService.sendRelayBinary(requestId, new Uint8Array(data))
      },
      end: (totalBytes) => {
        this.connectSDKService.sendRelayMessage({
          type: 'relay:http:response:end',
          requestId,
          totalBytes,
        })
        this.inFlight.delete(requestId)
      },
    })

    this.inFlight.set(requestId, { req, res })

    try {
      this.expressApp(req as unknown as http.IncomingMessage, res)
    } catch (error) {
      Logger.warn(`Relay dispatch failed for ${params.method} ${params.path}: ${error}`, 'ConnectSDK')
      this.inFlight.delete(requestId)
      this.reject(requestId, 500)
    }
  }

  /**
   * Pushes a request body chunk into the matching synthetic request stream.
   * Frames for unknown requestIds (already settled or aborted) are dropped.
   */
  feedBinary(requestId: string, chunk: Uint8Array): void {
    this.inFlight.get(requestId)?.req.push(Buffer.from(chunk))
  }

  /**
   * Ends the synthetic request body stream.
   */
  feedEnd(requestId: string): void {
    const entry = this.inFlight.get(requestId)
    if (entry) {
      entry.req.complete = true
      entry.req.push(null)
    }
  }

  /**
   * Tears down an in-flight request. The controller sees a destroyed request
   * stream, and anything it writes afterwards is silently discarded.
   */
  abort(requestId: string, reason: string): void {
    const entry = this.inFlight.get(requestId)
    if (!entry) {
      return
    }

    this.inFlight.delete(requestId)
    entry.res.discard()
    entry.req.aborted = true
    entry.req.emit('aborted')
    // Nothing may be reading the stream anymore; the destroy error must not
    // become an unhandled 'error' event
    entry.req.on('error', () => {})
    entry.req.destroy(new Error(`Relay request aborted: ${reason}`))
  }

  // Responds without dispatching (overflow / not ready / dispatch crash)
  private reject(requestId: string, status: number): void {
    this.connectSDKService.sendRelayMessage({ type: 'relay:http:response:start', requestId, status, headers: {} })
    this.connectSDKService.sendRelayMessage({ type: 'relay:http:response:end', requestId, totalBytes: 0 })
  }
}

/**
 * The synthetic request: a Readable that carries the IncomingMessage surface
 * Express and its middlewares touch. Body bytes are push()ed in as binary
 * frames arrive.
 */
export class RelayIncomingMessage extends Readable {
  httpVersion = '1.1'
  httpVersionMajor = 1
  httpVersionMinor = 1
  method: string
  url: string
  headers: http.IncomingHttpHeaders
  complete = false
  aborted = false

  /* The minimum socket surface middlewares assume. remoteAddress is
     synthetic — the real client IP travels in x-forwarded-for.
     readable/writable must be true or on-finished treats the request as
     already settled and body-parser refuses to read it. */
  socket = {
    remoteAddress: '127.0.0.1',
    remotePort: 0,
    encrypted: false,
    readable: true,
    writable: true,
    destroyed: false,
    destroy: () => {},
    setTimeout: () => {},
    on: () => {},
    once: () => {},
    removeListener: () => {},
    address: () => ({}),
  }
  connection = this.socket

  constructor(method: string, url: string, headers: http.IncomingHttpHeaders) {
    super()
    this.method = method.toUpperCase()
    this.url = url
    this.headers = headers
  }

  /* Express swaps the prototype chain of dispatched requests
     (Object.setPrototypeOf(req, app.request)), which would resurrect
     IncomingMessage's socket-backed _read/_destroy. Own properties survive
     the swap. Data is pushed externally as frames arrive. */
  _read = (): void => {}

  _destroy = (error: Error | null, callback: (error?: Error | null) => void): void => {
    callback(error)
  }

  destroy = (error?: Error): this => {
    return Readable.prototype.destroy.call(this, error) as this
  }
}

type ResponseSink = {
  start: (status: number, headers: http.OutgoingHttpHeaders) => void,
  chunk: (data: Buffer) => void,
  end: (totalBytes: number) => void,
}

/**
 * The synthetic response: a real ServerResponse whose output methods are
 * redirected into the relay sink instead of a socket. `start` fires once,
 * lazily, on the first write/end.
 *
 * The output methods are own instance properties, not prototype methods,
 * because Express swaps the prototype chain of dispatched responses
 * (Object.setPrototypeOf(res, app.response)) — prototype overrides would be
 * silently bypassed.
 */
export class RelayServerResponse extends http.ServerResponse {
  private started = false
  private ended = false
  private totalBytes = 0

  constructor(req: RelayIncomingMessage, private readonly sink: ResponseSink) {
    super(req as unknown as http.IncomingMessage)
  }

  /**
   * Silences the response after an abort: nothing further is emitted.
   */
  discard = (): void => {
    this.started = true
    this.ended = true
  }

  writeHead = (statusCode: number, reasonOrHeaders?: unknown, maybeHeaders?: unknown): this => {
    this.statusCode = statusCode

    const headers = (typeof reasonOrHeaders === 'object' ? reasonOrHeaders : maybeHeaders) as http.OutgoingHttpHeaders | undefined
    if (headers && !Array.isArray(headers)) {
      for (const [name, value] of Object.entries(headers)) {
        if (value !== undefined) {
          this.setHeader(name, value)
        }
      }
    }

    return this
  }

  write = (chunk: unknown, encodingOrCallback?: unknown, maybeCallback?: unknown): boolean => {
    const encoding = typeof encodingOrCallback === 'string' ? encodingOrCallback as BufferEncoding : undefined
    const callback = typeof encodingOrCallback === 'function' ? encodingOrCallback : maybeCallback

    if (!this.ended && chunk != null) {
      this.emitStart()
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), encoding)
      this.totalBytes += buffer.length
      this.sink.chunk(buffer)
    }

    if (typeof callback === 'function') {
      callback()
    }

    return true
  }

  end = (chunkOrCallback?: unknown, encodingOrCallback?: unknown, maybeCallback?: unknown): this => {
    const chunk = typeof chunkOrCallback === 'function' ? undefined : chunkOrCallback
    const callback = [chunkOrCallback, encodingOrCallback, maybeCallback].find((arg) => typeof arg === 'function') as (() => void) | undefined

    if (this.ended) {
      callback?.()
      return this
    }

    if (chunk != null) {
      this.write(chunk, typeof encodingOrCallback === 'string' ? encodingOrCallback : undefined)
    }

    this.emitStart()
    this.ended = true
    this.sink.end(this.totalBytes)
    callback?.()
    this.emit('finish')

    return this
  }

  private emitStart = (): void => {
    if (!this.started) {
      this.started = true
      this.sink.start(this.statusCode, this.getHeaders())
    }
  }
}

// Lowercases header names, as Node does for real requests
function normalizeHeaders(headers: Record<string, string | string[]>): http.IncomingHttpHeaders {
  const out: http.IncomingHttpHeaders = {}
  for (const [name, value] of Object.entries(headers ?? {})) {
    out[name.toLowerCase()] = value
  }
  return out
}

// Drops undefined values so the wire message is clean JSON
function serializeHeaders(headers: http.OutgoingHttpHeaders): Record<string, string | number | string[]> {
  const out: Record<string, string | number | string[]> = {}
  for (const [name, value] of Object.entries(headers)) {
    if (value !== undefined) {
      out[name] = value as string | number | string[]
    }
  }
  return out
}
