import * as request from 'supertest'

import { TestApp, createTestApp, destroyTestApp } from '../../helpers/create-app'

describe('POST /api/v1/auth/logout', () => {
  let testApp: TestApp

  beforeAll(async () => {
    testApp = await createTestApp()
  }, 90000)

  afterAll(async () => {
    await destroyTestApp(testApp)
  })

  it('returns 201', () => {
    return request(testApp.app.getHttpServer())
      .post('/api/v1/auth/logout')
      .expect(201)
  })

  it('clears the cardinal_refresh_tolkien cookie', async () => {
    const response = await request(testApp.app.getHttpServer())
      .post('/api/v1/auth/logout')
      .expect(201)

    const rawCookies = response.headers['set-cookie']
    const cookies: string[] = Array.isArray(rawCookies) ? rawCookies : rawCookies ? [rawCookies] : []
    const cleared = cookies.find((c) => c.startsWith('cardinal_refresh_tolkien='))
    expect(cleared).toBeDefined()
    // A cleared cookie has either an empty value or Max-Age=0
    expect(cleared).toMatch(/cardinal_refresh_tolkien=;|Max-Age=0/i)
  })
})
