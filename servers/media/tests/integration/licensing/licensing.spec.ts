import * as request from 'supertest'

import { createTestApp, destroyTestApp, TestApp } from '../../helpers/create-app'
import { UserService } from '../../../src/modules/user/user.service'

let testApp: TestApp
let authToken: string

beforeAll(async () => {
  testApp = await createTestApp()

  await request(testApp.app.getHttpServer())
    .post('/api/v1/setup')
    .send({ serverName: 'Licensing Test Server', theme: 'dark', sendAnonymousUsageData: false })

  const userService = testApp.moduleRef.get(UserService)
  const guestAccount = await userService.getGuestAccount()

  const loginRes = await request(testApp.app.getHttpServer())
    .post('/api/v1/login')
    .set('cardinal-app', 'admin')
    .send({ userId: guestAccount.userId })
    .expect(201)

  authToken = loginRes.body.JWT
}, 90000)

afterAll(async () => {
  await destroyTestApp(testApp)
})

// -------------------------------------------------------------------------
// GET /api/v1/licensing/subscription
// -------------------------------------------------------------------------

describe('GET /api/v1/licensing/subscription', () => {
  it('returns 200 with a subscription tier object', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/licensing/subscription')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body).toHaveProperty('slug')
    expect(res.body).toHaveProperty('name')
    expect(res.body).toHaveProperty('provides')
    expect(typeof res.body.provides.seats).toBe('number')
  })

  it('defaults to the free tier when no cloud owner is set', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/licensing/subscription')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body.slug).toBe('free')
  })

  it('returns 403 without auth', () => {
    return request(testApp.app.getHttpServer())
      .get('/api/v1/licensing/subscription')
      .expect(403)
  })
})

// -------------------------------------------------------------------------
// GET /api/v1/licensing/seats
// -------------------------------------------------------------------------

describe('GET /api/v1/licensing/seats', () => {
  it('returns 200 with used and total seat counts', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/licensing/seats')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body).toHaveProperty('used')
    expect(res.body).toHaveProperty('total')
    expect(typeof res.body.used).toBe('number')
    expect(typeof res.body.total).toBe('number')
  })

  it('total reflects the free tier seat limit', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/licensing/seats')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body.total).toBe(2)
  })

  it('used seats does not count the guest account', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/licensing/seats')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body.used).toBe(0)
  })

  it('returns 403 without auth', () => {
    return request(testApp.app.getHttpServer())
      .get('/api/v1/licensing/seats')
      .expect(403)
  })
})
