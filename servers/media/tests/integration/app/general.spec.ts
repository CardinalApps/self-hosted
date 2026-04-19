import * as request from 'supertest'

import { createTestApp, destroyTestApp, TestApp } from '../../helpers/create-app'

let testApp: TestApp

beforeAll(async () => {
  testApp = await createTestApp()
}, 90000)

afterAll(async () => {
  await destroyTestApp(testApp)
})

describe('GET /api', () => {
  it('returns 200 with versions and endpoints', async () => {
    const res = await request(testApp.app.getHttpServer()).get('/api').expect(200)
    expect(res.body).toHaveProperty('versions')
    expect(res.body).toHaveProperty('endpoints')
    expect(Array.isArray(res.body.endpoints)).toBe(true)
  })
})

describe('GET /api/v1/health', () => {
  it('returns 200 with a state of not_setup on a fresh server', () => {
    return request(testApp.app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect({ state: 'not_setup' })
  })
})

describe('GET /api/v1/instance', () => {
  it('returns 200 with instance info', async () => {
    const res = await request(testApp.app.getHttpServer()).get('/api/v1/instance').expect(200)
    expect(res.body).toHaveProperty('instanceId')
    expect(res.body).toHaveProperty('serverName')
    expect(res.body).toHaveProperty('kioskMode')
  })
})

describe('GET /api/v1/versions', () => {
  it('returns 403 on a not_setup server', () => {
    return request(testApp.app.getHttpServer()).get('/api/v1/versions').expect(403)
  })
})

describe('GET /api/v1/release-channels', () => {
  it('returns 200 with release channel info', () => {
    return request(testApp.app.getHttpServer()).get('/api/v1/release-channels').expect(200)
  })
})

describe('GET /api/v1/updates', () => {
  it('returns 503 in development mode', () => {
    return request(testApp.app.getHttpServer()).get('/api/v1/updates').expect(503)
  })
})

describe('GET /api/v1/events/subscribe', () => {
  it('returns 400 when authorization query param is missing', () => {
    return request(testApp.app.getHttpServer()).get('/api/v1/events/subscribe').expect(400)
  })
})

describe('GET /api/v1/ls', () => {
  it('returns 403 on a not_setup server', () => {
    return request(testApp.app.getHttpServer())
      .get('/api/v1/ls')
      .query({ rootDir: 'music' })
      .expect(403)
  })

  it('returns 403 on a not_setup server even without a rootDir', () => {
    return request(testApp.app.getHttpServer()).get('/api/v1/ls').expect(403)
  })
})
