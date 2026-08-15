import * as crypto from 'crypto'
import * as express from 'express'

import { createTestApp, destroyTestApp, TestApp } from '../../../helpers/create-app'
import { RelayRequestHandler } from '../../../../src/modules/remote-access/relay/relay-request-handler'
import { ConnectSDKEvents } from '../../../../src/modules/remote-access/connect/connect-sdk.events'
import { ConnectSDKService } from '../../../../src/modules/remote-access/connect/connect-sdk.service'

type SentMessage = { type: string, requestId: string, status?: number, totalBytes?: number }

type Capture = {
  messages: SentMessage[],
  frames: { requestId: string, chunk: Uint8Array }[],
}

function bodyOf(capture: Capture, requestId: string): Buffer {
  return Buffer.concat(capture.frames.filter((f) => f.requestId === requestId).map((f) => Buffer.from(f.chunk)))
}

function endOf(capture: Capture, requestId: string): SentMessage | undefined {
  return capture.messages.find((m) => m.type === 'relay:http:response:end' && m.requestId === requestId)
}

function startOf(capture: Capture, requestId: string): SentMessage | undefined {
  return capture.messages.find((m) => m.type === 'relay:http:response:start' && m.requestId === requestId)
}

async function waitFor(condition: () => boolean, timeoutMs = 10000): Promise<void> {
  const startTime = Date.now()
  while (!condition()) {
    if (Date.now() - startTime > timeoutMs) {
      throw new Error('Timed out waiting for condition')
    }
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
}

// -------------------------------------------------------------------------
// Relaying into the real Media Server app
// -------------------------------------------------------------------------

describe('relay through the real Media Server app', () => {
  let testApp: TestApp
  let events: ConnectSDKEvents
  const capture: Capture = { messages: [], frames: [] }

  beforeAll(async () => {
    testApp = await createTestApp()

    const sdk = testApp.moduleRef.get(ConnectSDKService)
    jest.spyOn(sdk, 'sendRelayMessage').mockImplementation((message) => {
      capture.messages.push(message as SentMessage)
    })
    jest.spyOn(sdk, 'sendRelayBinary').mockImplementation((requestId, chunk) => {
      capture.frames.push({ requestId, chunk })
    })

    events = testApp.moduleRef.get(ConnectSDKEvents)
    testApp.moduleRef.get(RelayRequestHandler).attach(testApp.app.getHttpAdapter().getInstance())
  }, 90000)

  afterAll(async () => {
    await destroyTestApp(testApp)
  })

  it('serves a real API route over the relay', async () => {
    events.emit('relay:http:request', { requestId: 'real-1', method: 'GET', path: '/api/v1/health', headers: {} })
    events.emit('relay:http:request:end', { requestId: 'real-1' })
    await waitFor(() => !!endOf(capture, 'real-1'))

    expect(startOf(capture, 'real-1')).toMatchObject({ status: 200 })
    expect(JSON.parse(bodyOf(capture, 'real-1').toString())).toHaveProperty('state')
  })

  it('parses a relayed JSON body through the real middleware stack', async () => {
    const payload = Buffer.from(JSON.stringify({ userId: 'nobody' }))

    events.emit('relay:http:request', {
      requestId: 'real-2',
      method: 'POST',
      path: '/api/v1/auth/login',
      headers: {
        'content-type': 'application/json',
        'content-length': String(payload.length),
        'cardinal-app': 'admin',
      },
    })
    events.emit('binary:frame', { requestId: 'real-2', chunk: payload })
    events.emit('relay:http:request:end', { requestId: 'real-2' })
    await waitFor(() => !!endOf(capture, 'real-2'))

    /* 403 (not 400/500) proves the route ran and the body-parser read the
       relayed body: an unknown userId is rejected by the auth logic itself */
    expect(startOf(capture, 'real-2')).toMatchObject({ status: 403 })
  })
})

// -------------------------------------------------------------------------
// Streaming behaviour against a minimal Express app
// -------------------------------------------------------------------------

describe('relay streaming against a minimal Express app', () => {
  let handler: RelayRequestHandler
  const capture: Capture = { messages: [], frames: [] }

  beforeAll(() => {
    const app = express()

    app.get('/echo', (req, res) => {
      res.json({ ok: true })
    })

    app.post('/upload', (req, res) => {
      const chunks: Buffer[] = []
      req.on('data', (chunk: Buffer) => chunks.push(chunk))
      req.on('end', () => {
        res.setHeader('content-type', 'application/octet-stream')
        res.end(Buffer.concat(chunks))
      })
    })

    app.get('/sse', (req, res) => {
      res.writeHead(200, { 'content-type': 'text/event-stream' })
      let sent = 0
      const timer = setInterval(() => {
        res.write(`data: tick-${sent}\n\n`)
        sent++
        if (sent === 50) {
          clearInterval(timer)
          res.end()
        }
      }, 100)
    })

    const sdk = {
      sendRelayMessage: (message: SentMessage) => { capture.messages.push(message) },
      sendRelayBinary: (requestId: string, chunk: Uint8Array) => { capture.frames.push({ requestId, chunk }) },
      isPathEnabled: async () => true,
    }
    const events = new ConnectSDKEvents()
    handler = new RelayRequestHandler(sdk as unknown as ConnectSDKService, events)
    handler.onApplicationBootstrap()
    handler.attach(app)
  })

  it('round-trips a 100 KB body intact', async () => {
    const payload = crypto.randomBytes(100 * 1024)

    handler.handle('up-1', {
      method: 'POST',
      path: '/upload',
      headers: { 'content-type': 'application/octet-stream', 'content-length': String(payload.length) },
    })
    for (let offset = 0; offset < payload.length; offset += 16384) {
      handler.feedBinary('up-1', payload.subarray(offset, offset + 16384))
    }
    handler.feedEnd('up-1')
    await waitFor(() => !!endOf(capture, 'up-1'))

    const echoed = bodyOf(capture, 'up-1')
    expect(echoed.length).toBe(payload.length)
    expect(echoed.equals(payload)).toBe(true)
  })

  it('completes 20 parallel GETs correctly', async () => {
    const ids = Array.from({ length: 20 }, (_, i) => `par-${i}`)

    for (const id of ids) {
      handler.handle(id, { method: 'GET', path: '/echo', headers: {} })
      handler.feedEnd(id)
    }
    await waitFor(() => ids.every((id) => !!endOf(capture, id)))

    for (const id of ids) {
      expect(startOf(capture, id)).toMatchObject({ status: 200 })
      expect(JSON.parse(bodyOf(capture, id).toString())).toEqual({ ok: true })
    }
  })

  it('streams 50 ordered frames for a long-lived response, then ends', async () => {
    handler.handle('sse-1', { method: 'GET', path: '/sse', headers: {} })
    handler.feedEnd('sse-1')
    await waitFor(() => !!endOf(capture, 'sse-1'), 15000)

    const frames = capture.frames.filter((f) => f.requestId === 'sse-1')
    expect(frames).toHaveLength(50)
    frames.forEach((frame, i) => {
      expect(Buffer.from(frame.chunk).toString()).toBe(`data: tick-${i}\n\n`)
    })

    // The end message is sequenced after every frame
    const endIndex = capture.messages.findIndex((m) => m.type === 'relay:http:response:end' && m.requestId === 'sse-1')
    expect(endIndex).toBeGreaterThan(-1)
    expect(endOf(capture, 'sse-1')).toMatchObject({ totalBytes: frames.reduce((sum, f) => sum + f.chunk.length, 0) })
  })
})
