import * as request from 'supertest'

import { createTestApp, destroyTestApp, TestApp } from '../../helpers/create-app'
import { UserService } from '../../../src/modules/user/user.service'

let testApp: TestApp
let authToken: string

beforeAll(async () => {
  testApp = await createTestApp()

  await request(testApp.app.getHttpServer())
    .post('/api/v1/setup')
    .send({ serverName: 'Settings Test Server', theme: 'dark', sendAnonymousUsageData: false })

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
// GET /api/v1/settings/:app
// -------------------------------------------------------------------------

describe('GET /api/v1/settings/:app', () => {
  it('returns 200 with a settings object for admin', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/settings/admin')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body).toHaveProperty('settings')
    expect(typeof res.body.settings).toBe('object')
    expect(res.body.settings).toHaveProperty('theme')
  })

  it('returns 200 with a settings object for music', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/settings/music')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body).toHaveProperty('settings')
    expect(typeof res.body.settings).toBe('object')
  })

  it('returns 200 with a settings object for photos', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/settings/photos')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body).toHaveProperty('settings')
    expect(typeof res.body.settings).toBe('object')
  })

  it('returns 200 with a settings object for cinema', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/settings/cinema')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body).toHaveProperty('settings')
    expect(typeof res.body.settings).toBe('object')
  })

  it('reflects the theme set during setup', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/settings/admin')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body.settings.theme).toBe('dark')
  })

  it('returns 403 without auth', () => {
    return request(testApp.app.getHttpServer())
      .get('/api/v1/settings/admin')
      .expect(403)
  })
})

// -------------------------------------------------------------------------
// PATCH /api/v1/settings
// -------------------------------------------------------------------------

describe('PATCH /api/v1/settings', () => {
  it('returns 200 with the updated settings when app is specified', async () => {
    const res = await request(testApp.app.getHttpServer())
      .patch('/api/v1/settings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ app: 'admin', settings: { theme: 'light' } })
      .expect(200)

    expect(res.body).toHaveProperty('updated')
    expect(Array.isArray(res.body.updated)).toBe(true)
  })

  it('persists the update when reading back', async () => {
    await request(testApp.app.getHttpServer())
      .patch('/api/v1/settings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ app: 'admin', settings: { theme: 'light' } })

    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/settings/admin')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body.settings.theme).toBe('light')
  })

  it('applies the update to all apps when app is omitted', async () => {
    await request(testApp.app.getHttpServer())
      .patch('/api/v1/settings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ settings: { theme: 'dark' } })
      .expect(200)

    for (const app of ['admin', 'music', 'photos', 'cinema']) {
      const res = await request(testApp.app.getHttpServer())
        .get(`/api/v1/settings/${app}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(res.body.settings.theme).toBe('dark')
    }
  })

  it('returns 400 when settings object is empty', () => {
    return request(testApp.app.getHttpServer())
      .patch('/api/v1/settings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ app: 'admin', settings: {} })
      .expect(400)
  })

  it('returns 400 when settings field is missing', () => {
    return request(testApp.app.getHttpServer())
      .patch('/api/v1/settings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ app: 'admin' })
      .expect(400)
  })

  it('returns 403 without auth', () => {
    return request(testApp.app.getHttpServer())
      .patch('/api/v1/settings')
      .send({ app: 'admin', settings: { theme: 'light' } })
      .expect(403)
  })
})
