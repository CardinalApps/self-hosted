import * as request from 'supertest'

import { createTestApp, destroyTestApp, TestApp } from '../../helpers/create-app'
import { UserService } from '../../../src/modules/user/user.service'

let testApp: TestApp
let authToken: string
let guestUserId: string

beforeAll(async () => {
  testApp = await createTestApp()

  await request(testApp.app.getHttpServer())
    .post('/api/v1/setup')
    .send({ serverName: 'Users Test Server', theme: 'dark', sendAnonymousUsageData: false })

  const userService = testApp.moduleRef.get(UserService)
  const guestAccount = await userService.getGuestAccount()
  guestUserId = guestAccount.userId

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
// PATCH /api/v1/users/current
// -------------------------------------------------------------------------

describe('PATCH /api/v1/users/current', () => {
  it('returns 200 with the updated user', async () => {
    const res = await request(testApp.app.getHttpServer())
      .patch('/api/v1/users/current')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ password: 'newpassword123' })
      .expect(200)

    expect(res.body).toHaveProperty('userId', guestUserId)
    expect(res.body).not.toHaveProperty('password')
  })

  it('returns 401 when attempting to disable yourself', async () => {
    const res = await request(testApp.app.getHttpServer())
      .patch('/api/v1/users/current')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ enabled: false })
      .expect(401)

    expect(res.body.message).toContain('disable yourself')
  })

  it('returns 403 without auth', () => {
    return request(testApp.app.getHttpServer())
      .patch('/api/v1/users/current')
      .send({ password: 'newpassword123' })
      .expect(403)
  })
})

// -------------------------------------------------------------------------
// PATCH /api/v1/users/:id
// -------------------------------------------------------------------------

describe('PATCH /api/v1/users/:id', () => {
  let targetUserId: string

  beforeAll(async () => {
    const userService = testApp.moduleRef.get(UserService)
    const targetUser = await userService.createUser({
      dto: { username: 'update-target', password: 'initialpass', role: 'administrator' },
    })
    if (!targetUser) throw new Error('Test setup failed: could not create target user')
    targetUserId = targetUser.userId
  })

  it('returns 200 with the updated user', async () => {
    const res = await request(testApp.app.getHttpServer())
      .patch(`/api/v1/users/${targetUserId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ enabled: false })
      .expect(200)

    expect(res.body).toHaveProperty('userId', targetUserId)
    expect(res.body).toHaveProperty('enabled', false)
  })

  it('returns 403 without auth', () => {
    return request(testApp.app.getHttpServer())
      .patch(`/api/v1/users/${targetUserId}`)
      .send({ enabled: true })
      .expect(403)
  })
})
