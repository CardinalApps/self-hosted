import * as request from 'supertest'

import { createTestApp, destroyTestApp, TestApp } from '../../helpers/create-app'
import { UserService } from '../../../src/modules/user/user.service'

let testApp: TestApp
let authToken: string

beforeAll(async () => {
  testApp = await createTestApp()

  await request(testApp.app.getHttpServer())
    .post('/api/v1/setup')
    .send({ serverName: 'Playback Queues Test Server', theme: 'dark', sendAnonymousUsageData: false })

  const userService = testApp.moduleRef.get(UserService)
  const guestAccount = await userService.getGuestAccount()

  const loginRes = await request(testApp.app.getHttpServer())
    .post('/api/v1/auth/login')
    .set('cardinal-app', 'admin')
    .send({ userId: guestAccount.userId })
    .expect(201)

  authToken = loginRes.body.JWT
}, 90000)

afterAll(async () => {
  await destroyTestApp(testApp)
})

// -------------------------------------------------------------------------
// GET /api/v1/playback-queues
// -------------------------------------------------------------------------

describe('GET /api/v1/playback-queues', () => {
  it('returns 200 with a [queues, count] tuple', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/playback-queues')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body).toHaveLength(2)
    expect(Array.isArray(res.body[0])).toBe(true)
    expect(typeof res.body[1]).toBe('number')
  })

  it('returns 403 without auth', () => {
    return request(testApp.app.getHttpServer())
      .get('/api/v1/playback-queues')
      .expect(403)
  })
})

// -------------------------------------------------------------------------
// POST /api/v1/playback-queues
// -------------------------------------------------------------------------

describe('POST /api/v1/playback-queues', () => {
  it('returns 201 with a static queue', async () => {
    const res = await request(testApp.app.getHttpServer())
      .post('/api/v1/playback-queues')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ type: 'static' })
      .expect(201)

    expect(res.body).toHaveProperty('queueId')
    expect(res.body.type).toBe('static')
  })

  it('returns 201 with a dynamic queue', async () => {
    const res = await request(testApp.app.getHttpServer())
      .post('/api/v1/playback-queues')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ type: 'dynamic', dynamicType: 'true_shuffle' })
      .expect(201)

    expect(res.body.type).toBe('dynamic')
    expect(res.body.dynamicType).toBe('true_shuffle')
  })

  it('returns 400 when type is missing', () => {
    return request(testApp.app.getHttpServer())
      .post('/api/v1/playback-queues')
      .set('Authorization', `Bearer ${authToken}`)
      .send({})
      .expect(400)
  })

  it('returns 403 without auth', () => {
    return request(testApp.app.getHttpServer())
      .post('/api/v1/playback-queues')
      .send({ type: 'static' })
      .expect(403)
  })
})

// -------------------------------------------------------------------------
// GET /api/v1/playback-queues/:id
// -------------------------------------------------------------------------

describe('GET /api/v1/playback-queues/:id', () => {
  let queueId: string

  beforeAll(async () => {
    const res = await request(testApp.app.getHttpServer())
      .post('/api/v1/playback-queues')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ type: 'static' })

    queueId = res.body.queueId
  })

  it('returns 200 with the queue', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get(`/api/v1/playback-queues/${queueId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body.queueId).toBe(queueId)
  })

  it('returns 404 for a non-existent queue', () => {
    return request(testApp.app.getHttpServer())
      .get('/api/v1/playback-queues/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404)
  })

  it('returns 403 without auth', () => {
    return request(testApp.app.getHttpServer())
      .get(`/api/v1/playback-queues/${queueId}`)
      .expect(403)
  })
})

// -------------------------------------------------------------------------
// DELETE /api/v1/playback-queues/:id
// -------------------------------------------------------------------------

describe('DELETE /api/v1/playback-queues/:id', () => {
  let queueId: string

  beforeAll(async () => {
    const res = await request(testApp.app.getHttpServer())
      .post('/api/v1/playback-queues')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ type: 'static' })

    queueId = res.body.queueId
  })

  it('returns 200 and removes the queue', async () => {
    await request(testApp.app.getHttpServer())
      .delete(`/api/v1/playback-queues/${queueId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    await request(testApp.app.getHttpServer())
      .get(`/api/v1/playback-queues/${queueId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404)
  })

  it('returns 403 without auth', () => {
    return request(testApp.app.getHttpServer())
      .delete(`/api/v1/playback-queues/${queueId}`)
      .expect(403)
  })
})

// -------------------------------------------------------------------------
// POST /api/v1/playback-queues/:id/extend
// -------------------------------------------------------------------------

describe('POST /api/v1/playback-queues/:id/extend', () => {
  let queueId: string

  beforeAll(async () => {
    const res = await request(testApp.app.getHttpServer())
      .post('/api/v1/playback-queues')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ type: 'dynamic', dynamicType: 'true_shuffle' })

    queueId = res.body.queueId
  })

  it('returns 201', async () => {
    await request(testApp.app.getHttpServer())
      .post(`/api/v1/playback-queues/${queueId}/extend`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({})
      .expect(201)
  })

  it('returns 403 without auth', () => {
    return request(testApp.app.getHttpServer())
      .post(`/api/v1/playback-queues/${queueId}/extend`)
      .send({})
      .expect(403)
  })
})

// -------------------------------------------------------------------------
// GET /api/v1/playback-queues/:id/items
// -------------------------------------------------------------------------

describe('GET /api/v1/playback-queues/:id/items', () => {
  let queueId: string

  beforeAll(async () => {
    const res = await request(testApp.app.getHttpServer())
      .post('/api/v1/playback-queues')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ type: 'static' })

    queueId = res.body.queueId
  })

  it('returns 200 with a [items, count] tuple', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get(`/api/v1/playback-queues/${queueId}/items`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body).toHaveLength(2)
    expect(Array.isArray(res.body[0])).toBe(true)
    expect(typeof res.body[1]).toBe('number')
  })

  it('returns 403 without auth', () => {
    return request(testApp.app.getHttpServer())
      .get(`/api/v1/playback-queues/${queueId}/items`)
      .expect(403)
  })
})
