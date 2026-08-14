import * as express from 'express'

import { MEDIA_MAX_INFLIGHT_RELAY, RelayRequestHandler } from './relay-request-handler'
import { ConnectSDKEvents } from '../connect/connect-sdk.events'
import { ConnectSDKService } from '../connect/connect-sdk.service'

type SentMessage = { type: string, requestId: string, [key: string]: unknown }

function makeSdk() {
  const messages: SentMessage[] = []
  const frames: { requestId: string, chunk: Uint8Array }[] = []

  return {
    messages,
    frames,
    sendRelayMessage: jest.fn((message: SentMessage) => { messages.push(message) }),
    sendRelayBinary: jest.fn((requestId: string, chunk: Uint8Array) => { frames.push({ requestId, chunk }) }),
    isPathEnabled: jest.fn(async () => true),
  }
}

function makeHandler(app: express.Express) {
  const sdk = makeSdk()
  const events = new ConnectSDKEvents()
  const handler = new RelayRequestHandler(sdk as unknown as ConnectSDKService, events)
  handler.onApplicationBootstrap()
  handler.attach(app)

  return { handler, sdk, events }
}

async function waitFor(condition: () => boolean, timeoutMs = 2000): Promise<void> {
  const startTime = Date.now()
  while (!condition()) {
    if (Date.now() - startTime > timeoutMs) {
      throw new Error('Timed out waiting for condition')
    }
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
}

function endOf(sdk: ReturnType<typeof makeSdk>, requestId: string) {
  return sdk.messages.find((m) => m.type === 'relay:http:response:end' && m.requestId === requestId)
}

function startOf(sdk: ReturnType<typeof makeSdk>, requestId: string) {
  return sdk.messages.find((m) => m.type === 'relay:http:response:start' && m.requestId === requestId)
}

describe('RelayRequestHandler', () => {
  it('dispatches a GET and captures the response as start + frames + end', async () => {
    const app = express()
    app.get('/echo', (req, res) => {
      res.json({ ok: true })
    })
    const { handler, sdk } = makeHandler(app)

    handler.handle('req-1', { method: 'GET', path: '/echo', headers: {} })
    handler.feedEnd('req-1')
    await waitFor(() => !!endOf(sdk, 'req-1'))

    expect(startOf(sdk, 'req-1')).toMatchObject({ status: 200 })
    expect((startOf(sdk, 'req-1').headers as Record<string, string>)['content-type']).toContain('application/json')

    const body = Buffer.concat(sdk.frames.filter((f) => f.requestId === 'req-1').map((f) => Buffer.from(f.chunk)))
    expect(JSON.parse(body.toString())).toEqual({ ok: true })
    expect(endOf(sdk, 'req-1')).toMatchObject({ totalBytes: body.length })
    expect(handler.getInFlightCount()).toBe(0)
  })

  it('feeds binary frames into the request body for a POST', async () => {
    const app = express()
    app.use(express.json())
    app.post('/upload', (req, res) => {
      res.json({ received: req.body })
    })
    const { handler, sdk } = makeHandler(app)

    const payload = Buffer.from(JSON.stringify({ hello: 'relay' }))
    handler.handle('req-2', {
      method: 'POST',
      path: '/upload',
      headers: { 'content-type': 'application/json', 'content-length': String(payload.length) },
    })
    handler.feedBinary('req-2', payload.subarray(0, 5))
    handler.feedBinary('req-2', payload.subarray(5, 10))
    handler.feedBinary('req-2', payload.subarray(10))
    handler.feedEnd('req-2')
    await waitFor(() => !!endOf(sdk, 'req-2'))

    const body = Buffer.concat(sdk.frames.filter((f) => f.requestId === 'req-2').map((f) => Buffer.from(f.chunk)))
    expect(JSON.parse(body.toString())).toEqual({ received: { hello: 'relay' } })
  })

  it('emits one frame per res.write for a streaming response', async () => {
    const app = express()
    app.get('/stream', (req, res) => {
      res.writeHead(200, { 'content-type': 'text/plain' })
      for (let i = 0; i < 5; i++) {
        res.write(`chunk-${i};`)
      }
      res.end()
    })
    const { handler, sdk } = makeHandler(app)

    handler.handle('req-3', { method: 'GET', path: '/stream', headers: {} })
    handler.feedEnd('req-3')
    await waitFor(() => !!endOf(sdk, 'req-3'))

    const frames = sdk.frames.filter((f) => f.requestId === 'req-3')
    expect(frames).toHaveLength(5)
    expect(Buffer.from(frames[4].chunk).toString()).toBe('chunk-4;')
    expect(endOf(sdk, 'req-3')).toMatchObject({ totalBytes: 'chunk-0;'.repeat(1).length * 5 })
  })

  it('translates the relay client-IP header to x-forwarded-for', async () => {
    const app = express()
    let seenForwardedFor: string | undefined
    app.get('/ip', (req, res) => {
      seenForwardedFor = req.headers['x-forwarded-for'] as string
      res.end()
    })
    const { handler, sdk } = makeHandler(app)

    handler.handle('req-4', { method: 'GET', path: '/ip', headers: { 'x-cardinal-client-ip': '203.0.113.7' } })
    handler.feedEnd('req-4')
    await waitFor(() => !!endOf(sdk, 'req-4'))

    expect(seenForwardedFor).toBe('203.0.113.7')
  })

  it('stops all emission for an aborted request', async () => {
    const app = express()
    let capturedRes: express.Response | null = null
    app.get('/hang', (req, res) => {
      capturedRes = res
      // Never responds on its own
    })
    const { handler, sdk } = makeHandler(app)

    handler.handle('req-5', { method: 'GET', path: '/hang', headers: {} })
    await waitFor(() => capturedRes !== null)

    handler.abort('req-5', 'client_disconnect')
    expect(handler.getInFlightCount()).toBe(0)

    // Late writes from the controller are silently discarded
    capturedRes.write('too late')
    capturedRes.end()
    handler.feedBinary('req-5', Buffer.from('dropped'))
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(sdk.messages.filter((m) => m.requestId === 'req-5')).toHaveLength(0)
    expect(sdk.frames.filter((f) => f.requestId === 'req-5')).toHaveLength(0)
  })

  it('multiplexes concurrent requests without crossing frames', async () => {
    const app = express()
    app.get('/name/:name', (req, res) => {
      res.write(`${req.params.name};`)
      res.write(`${req.params.name};`)
      res.end()
    })
    const { handler, sdk } = makeHandler(app)

    handler.handle('req-a', { method: 'GET', path: '/name/alpha', headers: {} })
    handler.handle('req-b', { method: 'GET', path: '/name/beta', headers: {} })
    handler.feedEnd('req-a')
    handler.feedEnd('req-b')
    await waitFor(() => !!endOf(sdk, 'req-a') && !!endOf(sdk, 'req-b'))

    const bodyOf = (id: string) => Buffer.concat(sdk.frames.filter((f) => f.requestId === id).map((f) => Buffer.from(f.chunk))).toString()
    expect(bodyOf('req-a')).toBe('alpha;alpha;')
    expect(bodyOf('req-b')).toBe('beta;beta;')
  })

  it('rejects the 51st concurrent request with an immediate 503', async () => {
    const app = express()
    app.get('/hang', () => {
      // Never responds; keeps the request in flight
    })
    const { handler, sdk } = makeHandler(app)

    for (let i = 0; i < MEDIA_MAX_INFLIGHT_RELAY; i++) {
      handler.handle(`fill-${i}`, { method: 'GET', path: '/hang', headers: {} })
    }
    expect(handler.getInFlightCount()).toBe(MEDIA_MAX_INFLIGHT_RELAY)

    handler.handle('req-overflow', { method: 'GET', path: '/hang', headers: {} })

    expect(startOf(sdk, 'req-overflow')).toMatchObject({ status: 503 })
    expect(endOf(sdk, 'req-overflow')).toMatchObject({ totalBytes: 0 })
    expect(handler.getInFlightCount()).toBe(MEDIA_MAX_INFLIGHT_RELAY)
  })

  it('returns a 500 through the Express error handler when a controller throws', async () => {
    const app = express()
    app.get('/boom', () => {
      throw new Error('controller exploded')
    })
    const { handler, sdk } = makeHandler(app)

    handler.handle('req-6', { method: 'GET', path: '/boom', headers: {} })
    handler.feedEnd('req-6')
    await waitFor(() => !!endOf(sdk, 'req-6'))

    expect(startOf(sdk, 'req-6')).toMatchObject({ status: 500 })
  })
})
