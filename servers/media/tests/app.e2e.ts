import * as request from 'supertest'

import { createTestApp, destroyTestApp, TestApp } from './helpers/create-app'

describe('GET /health', () => {
  let testApp: TestApp

  beforeAll(async () => {
    testApp = await createTestApp()
  }, 90000)

  afterAll(async () => {
    await destroyTestApp(testApp)
  })

  it('returns 200 with a state of not_setup on a fresh server', () => {
    return request(testApp.app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect({ state: 'not_setup' })
  })
})
