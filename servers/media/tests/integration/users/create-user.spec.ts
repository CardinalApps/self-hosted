import * as request from 'supertest'

import { createTestApp, destroyTestApp, TestApp } from '../../helpers/create-app'
import { UserService } from '../../../src/modules/user/user.service'

let testApp: TestApp
let authToken: string

beforeAll(async () => {
  testApp = await createTestApp()

  await request(testApp.app.getHttpServer())
    .post('/api/v1/setup')
    .send({ serverName: 'Users Test Server', theme: 'dark', sendAnonymousUsageData: false })

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
// POST /api/v1/users
// -------------------------------------------------------------------------

describe('POST /api/v1/users', () => {
  it('returns 201 with the created user', async () => {
    const res = await request(testApp.app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ username: 'newuser', password: 'password123', role: 'administrator' })
      .expect(201)

    expect(res.body).toHaveProperty('userId')
    expect(res.body).toHaveProperty('username', 'newuser')
    expect(res.body).not.toHaveProperty('password')
  })

  it('returns 403 without auth', () => {
    return request(testApp.app.getHttpServer())
      .post('/api/v1/users')
      .send({ username: 'unauthorized', password: 'password123', role: 'administrator' })
      .expect(403)
  })
})
