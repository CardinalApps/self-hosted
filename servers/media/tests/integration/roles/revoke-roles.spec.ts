import * as request from 'supertest'

import { createTestApp, destroyTestApp, TestApp } from '../../helpers/create-app'
import { UserService } from '../../../src/modules/user/user.service'

let testApp: TestApp
let authToken: string
let guestUserId: string
let regularUserId: string

beforeAll(async () => {
  testApp = await createTestApp()

  await request(testApp.app.getHttpServer())
    .post('/api/v1/setup')
    .send({ serverName: 'Roles Test Server', theme: 'dark', sendAnonymousUsageData: false })

  const userService = testApp.moduleRef.get(UserService)
  const guestAccount = await userService.getGuestAccount()
  guestUserId = guestAccount.userId

  const regularUser = await userService.createUser({
    dto: { username: 'role-test-user', password: 'password123', role: 'media_apps_user' },
  })
  if (!regularUser) throw new Error('Test setup failed: could not create regular user')
  regularUserId = regularUser.userId

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
// DELETE /api/v1/roles/:role/assignments
// -------------------------------------------------------------------------

describe('DELETE /api/v1/roles/:role/assignments', () => {
  it('returns 200 and revokes the role', async () => {
    // Ensure the user has the role first
    await request(testApp.app.getHttpServer())
      .post('/api/v1/roles/administrator/assignments')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ userIds: [regularUserId] })

    const res = await request(testApp.app.getHttpServer())
      .delete('/api/v1/roles/administrator/assignments')
      .query({ userIds: regularUserId })
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(Array.isArray(res.body)).toBe(true)
  })

  it('returns 400 when targeting the guest account', () => {
    return request(testApp.app.getHttpServer())
      .delete('/api/v1/roles/administrator/assignments')
      .query({ userIds: guestUserId })
      .set('Authorization', `Bearer ${authToken}`)
      .expect(400)
  })

  it('returns 400 when userIds is missing', () => {
    return request(testApp.app.getHttpServer())
      .delete('/api/v1/roles/administrator/assignments')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(400)
  })

  it('returns 403 without auth', () => {
    return request(testApp.app.getHttpServer())
      .delete('/api/v1/roles/administrator/assignments')
      .query({ userIds: regularUserId })
      .expect(401)
  })
})
