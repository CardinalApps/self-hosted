import * as request from 'supertest'

import { createTestApp, destroyTestApp, TestApp } from '../../helpers/create-app'
import { UserService } from '../../../src/modules/user/user.service'

let testApp: TestApp
let authToken: string
let regularUserId: string

beforeAll(async () => {
  testApp = await createTestApp()

  await request(testApp.app.getHttpServer())
    .post('/api/v1/setup')
    .send({ serverName: 'Roles Test Server', theme: 'dark', sendAnonymousUsageData: false })

  const userService = testApp.moduleRef.get(UserService)
  const guestAccount = await userService.getGuestAccount()

  const regularUser = await userService.createUser({
    dto: { username: 'role-test-user', password: 'password123', role: 'media_apps_user' },
  })
  if (!regularUser) throw new Error('Test setup failed: could not create regular user')
  regularUserId = regularUser.userId

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
// POST /api/v1/roles/:role/assignments
// -------------------------------------------------------------------------

describe('POST /api/v1/roles/:role/assignments', () => {
  it('returns 201 with the new assignment', async () => {
    const res = await request(testApp.app.getHttpServer())
      .post('/api/v1/roles/administrator/assignments')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ userIds: [regularUserId] })
      .expect(201)

    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body[0]).toHaveProperty('role', 'administrator')
  })

  it('returns 403 when assigning a non-assignable role', () => {
    return request(testApp.app.getHttpServer())
      .post('/api/v1/roles/owner/assignments')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ userIds: [regularUserId] })
      .expect(403)
  })

  it('returns 400 when userIds is missing', () => {
    return request(testApp.app.getHttpServer())
      .post('/api/v1/roles/administrator/assignments')
      .set('Authorization', `Bearer ${authToken}`)
      .send({})
      .expect(400)
  })

  it('returns 403 without auth', () => {
    return request(testApp.app.getHttpServer())
      .post('/api/v1/roles/administrator/assignments')
      .send({ userIds: [regularUserId] })
      .expect(403)
  })
})
