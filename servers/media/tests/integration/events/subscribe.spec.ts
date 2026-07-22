import * as http from 'http'
import * as request from 'supertest'

import { createTestApp, destroyTestApp, TestApp } from '../../helpers/create-app'
import { UserService } from '../../../src/modules/user/user.service'
import { EventService } from '../../../src/modules/event/event.service'

let testApp: TestApp
let authToken: string
let guestUserId: string
let port: number

/*
 * The SSE response never ends, so supertest (which buffers until the response
 * completes) cannot be used against the subscribe endpoint. Raw http requests
 * allow asserting on the status and headers as soon as they arrive, then
 * destroying the socket.
 */
const openSSE = (options: { headers?: Record<string, string>, query?: string } = {}): Promise<http.IncomingMessage> =>
  new Promise((resolve, reject) => {
    const req = http.get({
      host: '127.0.0.1',
      port,
      path: `/api/v1/events/subscribe${options.query ?? ''}`,
      headers: options.headers,
    }, resolve)
    req.on('error', reject)
  })

beforeAll(async () => {
  testApp = await createTestApp()

  await request(testApp.app.getHttpServer())
    .post('/api/v1/setup')
    .send({ serverName: 'Events Test Server', theme: 'dark', sendAnonymousUsageData: false })

  const userService = testApp.moduleRef.get(UserService)
  const guestAccount = await userService.getGuestAccount()
  guestUserId = guestAccount.userId

  const loginRes = await request(testApp.app.getHttpServer())
    .post('/api/v1/auth/login')
    .set('cardinal-app', 'admin')
    .send({ userId: guestAccount.userId })
    .expect(201)

  authToken = loginRes.body.JWT

  const server = testApp.app.getHttpServer()
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  port = (server.address() as { port: number }).port
}, 90000)

afterAll(async () => {
  await destroyTestApp(testApp)
})

describe('GET /api/v1/events/subscribe', () => {
  it('returns 401 without authentication', async () => {
    const res = await openSSE()
    expect(res.statusCode).toBe(401)
    res.destroy()
  })

  it('returns 410 when the token fails verification', async () => {
    const res = await openSSE({ headers: { Authorization: 'Bearer not-a-real-token' } })
    expect(res.statusCode).toBe(410)
    res.destroy()
  })

  it('opens an event stream with the Authorization header', async () => {
    const res = await openSSE({ headers: { Authorization: `Bearer ${authToken}` } })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toContain('text/event-stream')
    res.destroy()
  })

  it('opens an event stream with the deprecated authorization query param', async () => {
    const res = await openSSE({ query: `?authorization=${authToken}` })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toContain('text/event-stream')
    res.destroy()
  })

  it('opens an event stream with the token query param', async () => {
    const res = await openSSE({ query: `?token=${authToken}` })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toContain('text/event-stream')
    res.destroy()
  })

  it('delivers events emitted to the connected user', async () => {
    const res = await openSSE({ headers: { Authorization: `Bearer ${authToken}` } })
    expect(res.statusCode).toBe(200)

    const received = new Promise<string>((resolve) => {
      res.setEncoding('utf8')
      res.on('data', (chunk: string) => resolve(chunk))
    })

    const eventService = testApp.moduleRef.get(EventService)
    eventService.emitToUser(guestUserId, 'test.ping', { hello: 'world' })

    const chunk = await received
    expect(chunk).toContain('data: ')
    expect(JSON.parse(chunk.replace('data: ', '').trim())).toEqual({ type: 'test.ping', payload: { hello: 'world' } })

    res.destroy()
  })
})
