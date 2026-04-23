import * as request from 'supertest'

import { UserService } from '../../../src/modules/user/user.service'
import { createTestApp, destroyTestApp, TestApp } from '../../helpers/create-app'

// -------------------------------------------------------------------------
// POST /api/v1/setup
// -------------------------------------------------------------------------

describe('POST /api/v1/setup', () => {
  let testApp: TestApp

  beforeAll(async () => {
    testApp = await createTestApp()
  }, 90000)

  afterAll(async () => {
    await destroyTestApp(testApp)
  })

  it('returns 201 with server name and accountToLogInto on a fresh server', async () => {
    const res = await request(testApp.app.getHttpServer())
      .post('/api/v1/setup')
      .send({ serverName: 'Test Server', theme: 'dark', sendAnonymousUsageData: false })
      .expect(201)

    expect(res.body).toHaveProperty('serverName', 'Test Server')
    expect(res.body).toHaveProperty('accountToLogInto')
    expect(typeof res.body.accountToLogInto).toBe('string')
  })

  it('returns 403 when called a second time', () => {
    return request(testApp.app.getHttpServer())
      .post('/api/v1/setup')
      .send({ serverName: 'Test Server', theme: 'dark', sendAnonymousUsageData: false })
      .expect(403)
  })
})

// -------------------------------------------------------------------------
// POST /api/v1/reset
// -------------------------------------------------------------------------

describe('POST /api/v1/reset', () => {
  let testApp: TestApp
  let authToken: string

  beforeAll(async () => {
    testApp = await createTestApp()

    // Complete setup so the server is in a usable state
    await request(testApp.app.getHttpServer())
      .post('/api/v1/setup')
      .send({ serverName: 'Reset Test Server', theme: 'dark', sendAnonymousUsageData: false })

    // Log into the guest account to get an auth token for subsequent requests
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
  // Auth
  // -------------------------------------------------------------------------

  it('returns 403 when no auth token is provided', () => {
    return request(testApp.app.getHttpServer())
      .post('/api/v1/reset')
      .send({ type: 'media', validationString: 'Deindex media' })
      .expect(403)
  })

  // -------------------------------------------------------------------------
  // Media reset
  // -------------------------------------------------------------------------

  describe('media reset', () => {
    it('returns 500 with an incorrect validation string', () => {
      return request(testApp.app.getHttpServer())
        .post('/api/v1/reset')
        .set('Authorization', `Bearer ${authToken}`)
        .set('cardinal-app', 'admin')
        .send({ type: 'media', validationString: 'wrong phrase' })
        .expect(500)
    })

    it('returns 201 on success', () => {
      return request(testApp.app.getHttpServer())
        .post('/api/v1/reset')
        .set('Authorization', `Bearer ${authToken}`)
        .set('cardinal-app', 'admin')
        .send({ type: 'media', validationString: 'Deindex media' })
        .expect(201)
    })
  })

  // -------------------------------------------------------------------------
  // Factory reset
  // -------------------------------------------------------------------------

  describe('factory reset', () => {
    it('returns 500 with an incorrect validation string', () => {
      return request(testApp.app.getHttpServer())
        .post('/api/v1/reset')
        .set('Authorization', `Bearer ${authToken}`)
        .set('cardinal-app', 'admin')
        .send({ type: 'factory', validationString: 'wrong phrase' })
        .expect(500)
    })

    it('returns 201 on success', () => {
      return request(testApp.app.getHttpServer())
        .post('/api/v1/reset')
        .set('Authorization', `Bearer ${authToken}`)
        .set('cardinal-app', 'admin')
        .send({ type: 'factory', validationString: 'Factory reset' })
        .expect(201)
    })
  })
})
