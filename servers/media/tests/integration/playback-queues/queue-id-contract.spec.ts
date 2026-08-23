import * as request from 'supertest'
import { v4 as uuid } from 'uuid'

import { createTestApp, destroyTestApp, TestApp } from '../../helpers/create-app'
import { UserService } from '../../../src/modules/user/user.service'

let testApp: TestApp
let authToken: string
let queueId: string

// An all-digits param that overflows the 32 bit row ID column. Postgres throws
// on an out of range comparison where SQLite simply matches nothing.
const OVERFLOWING_ROW_ID = '99999999999999999999'

beforeAll(async () => {
  testApp = await createTestApp()

  await request(testApp.app.getHttpServer())
    .post('/api/v1/setup')
    .send({ serverName: 'Queue ID Contract Server', theme: 'dark', sendAnonymousUsageData: false })

  const userService = testApp.moduleRef.get(UserService)
  const guestAccount = await userService.getGuestAccount()

  const loginRes = await request(testApp.app.getHttpServer())
    .post('/api/v1/auth/login')
    .set('cardinal-app', 'admin')
    .send({ userId: guestAccount.userId })
    .expect(201)

  authToken = loginRes.body.JWT

  const queueRes = await request(testApp.app.getHttpServer())
    .post('/api/v1/playback-queues')
    .set('Authorization', `Bearer ${authToken}`)
    .send({ type: 'static', items: [] })
    .expect(201)

  queueId = queueRes.body.queueId
}, 90000)

afterAll(async () => {
  await destroyTestApp(testApp)
})

// -------------------------------------------------------------------------
// GET /api/v1/playback-queues/:id
//
// The param DTO is a string, so the row ID branch of the service lookup is
// unreachable over HTTP: every param is compared against the UUID column. These
// pin that, so a param DTO changed to a number would fail here rather than
// start returning 500s for UUIDs.
// -------------------------------------------------------------------------

describe('GET /api/v1/playback-queues/:id', () => {
  it('returns the queue addressed by its UUID queue ID', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get(`/api/v1/playback-queues/${queueId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body.queueId).toBe(queueId)
  })

  it('returns 404 rather than 500 for a UUID that matches no queue', () => {
    return request(testApp.app.getHttpServer())
      .get(`/api/v1/playback-queues/${uuid()}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404)
  })

  it('returns 404 rather than 500 for a param that is not a queue ID', () => {
    return request(testApp.app.getHttpServer())
      .get('/api/v1/playback-queues/not-an-identifier')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404)
  })

  it('returns 404 rather than 500 for an all-digits param', () => {
    return request(testApp.app.getHttpServer())
      .get('/api/v1/playback-queues/1')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404)
  })

  it('returns 404 rather than 500 for a numeric param too large to be a row ID', () => {
    return request(testApp.app.getHttpServer())
      .get(`/api/v1/playback-queues/${OVERFLOWING_ROW_ID}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404)
  })
})

// -------------------------------------------------------------------------
// POST /api/v1/playback-queues/:id/extend
// -------------------------------------------------------------------------

describe('POST /api/v1/playback-queues/:id/extend', () => {
  it('returns 404 rather than 500 for a UUID that matches no queue', () => {
    return request(testApp.app.getHttpServer())
      .post(`/api/v1/playback-queues/${uuid()}/extend`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({})
      .expect(404)
  })

  it('returns 404 rather than 500 for a numeric param too large to be a row ID', () => {
    return request(testApp.app.getHttpServer())
      .post(`/api/v1/playback-queues/${OVERFLOWING_ROW_ID}/extend`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({})
      .expect(404)
  })
})
