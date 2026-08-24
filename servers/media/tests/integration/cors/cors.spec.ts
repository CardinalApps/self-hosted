import * as request from 'supertest'

import { createTestApp, destroyTestApp, TestApp } from '../../helpers/create-app'
import { UserService } from '../../../src/modules/user/user.service'

let testApp: TestApp
let authToken: string
let nonAdminToken: string

beforeAll(async () => {
  testApp = await createTestApp()

  await request(testApp.app.getHttpServer())
    .post('/api/v1/setup')
    .send({ serverName: 'CORS Test Server', theme: 'dark', sendAnonymousUsageData: false })

  const userService = testApp.moduleRef.get(UserService)
  const guestAccount = await userService.getGuestAccount()

  const loginRes = await request(testApp.app.getHttpServer())
    .post('/api/v1/auth/login')
    .set('cardinal-app', 'admin')
    .send({ userId: guestAccount.userId })
    .expect(201)

  authToken = loginRes.body.JWT

  await request(testApp.app.getHttpServer())
    .post('/api/v1/users')
    .set('Authorization', `Bearer ${authToken}`)
    .send({ username: 'corsuser', password: 'password123', role: 'music_user' })
    .expect(201)

  const nonAdminLoginRes = await request(testApp.app.getHttpServer())
    .post('/api/v1/auth/login')
    .set('cardinal-app', 'music')
    .send({ username: 'corsuser', password: 'password123' })
    .expect(201)

  nonAdminToken = nonAdminLoginRes.body.JWT
}, 90000)

afterAll(async () => {
  await destroyTestApp(testApp)
})

// -------------------------------------------------------------------------
// Preflight behaviour
// -------------------------------------------------------------------------

describe('CORS preflight', () => {
  it('allows a Cardinal hosted app origin', async () => {
    const res = await request(testApp.app.getHttpServer())
      .options('/api/v1/users')
      .set('Origin', 'https://music.cardinalapps.io')
      .set('Access-Control-Request-Method', 'GET')

    expect(res.headers['access-control-allow-origin']).toBe('https://music.cardinalapps.io')
    expect(res.headers['access-control-allow-credentials']).toBe('true')
  })

  it('sends no allow-origin header for a denied origin', async () => {
    const res = await request(testApp.app.getHttpServer())
      .options('/api/v1/users')
      .set('Origin', 'https://evil.example.com')
      .set('Access-Control-Request-Method', 'GET')

    expect(res.headers['access-control-allow-origin']).toBeUndefined()
  })
})

// -------------------------------------------------------------------------
// Custom origin management
// -------------------------------------------------------------------------

describe('POST /api/v1/cors-origins', () => {
  it('adds an origin that is then allowed by preflight', async () => {
    const res = await request(testApp.app.getHttpServer())
      .post('/api/v1/cors-origins')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ origin: 'https://x.example' })
      .expect(201)

    expect(res.body).toHaveProperty('corsOriginId')
    expect(res.body).toHaveProperty('origin', 'https://x.example')

    const preflight = await request(testApp.app.getHttpServer())
      .options('/api/v1/users')
      .set('Origin', 'https://x.example')
      .set('Access-Control-Request-Method', 'GET')

    expect(preflight.headers['access-control-allow-origin']).toBe('https://x.example')
  })

  it('returns 403 for a non-admin user', () => {
    return request(testApp.app.getHttpServer())
      .post('/api/v1/cors-origins')
      .set('Authorization', `Bearer ${nonAdminToken}`)
      .send({ origin: 'https://sneaky.example.com' })
      .expect(403)
  })

  it('returns 400 for a malformed origin', () => {
    return request(testApp.app.getHttpServer())
      .post('/api/v1/cors-origins')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ origin: 'not a url' })
      .expect(400)
  })

  it('returns 401 without auth', () => {
    return request(testApp.app.getHttpServer())
      .post('/api/v1/cors-origins')
      .send({ origin: 'https://x.example' })
      .expect(401)
  })
})

describe('GET /api/v1/cors-origins', () => {
  it('lists the custom origins', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/cors-origins')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.some((row: { origin: string }) => row.origin === 'https://x.example')).toBe(true)
  })
})

describe('DELETE /api/v1/cors-origins/:id', () => {
  it('removes the origin and preflight denies it again', async () => {
    const listRes = await request(testApp.app.getHttpServer())
      .get('/api/v1/cors-origins')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    const row = listRes.body.find((r: { origin: string }) => r.origin === 'https://x.example')
    expect(row).toBeDefined()

    await request(testApp.app.getHttpServer())
      .delete(`/api/v1/cors-origins/${row.corsOriginId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    const preflight = await request(testApp.app.getHttpServer())
      .options('/api/v1/users')
      .set('Origin', 'https://x.example')
      .set('Access-Control-Request-Method', 'GET')

    expect(preflight.headers['access-control-allow-origin']).toBeUndefined()
  })

  it('returns 404 for an unknown id', () => {
    return request(testApp.app.getHttpServer())
      .delete('/api/v1/cors-origins/00000000-0000-4000-8000-000000000000')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404)
  })
})
