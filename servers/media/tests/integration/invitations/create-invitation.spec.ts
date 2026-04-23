import * as request from 'supertest'

import { createTestApp, destroyTestApp, TestApp } from '../../helpers/create-app'
import { UserService } from '../../../src/modules/user/user.service'

let testApp: TestApp
let authToken: string

beforeAll(async () => {
  testApp = await createTestApp()

  await request(testApp.app.getHttpServer())
    .post('/api/v1/setup')
    .send({ serverName: 'Invitations Test Server', theme: 'dark', sendAnonymousUsageData: false })

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
// POST /api/v1/invitations
// -------------------------------------------------------------------------

describe('POST /api/v1/invitations', () => {
  it('returns 201 with the created invitation for type=link', async () => {
    const res = await request(testApp.app.getHttpServer())
      .post('/api/v1/invitations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ type: 'link' })
      .expect(201)

    expect(res.body).toHaveProperty('invitationId')
    expect(res.body).toHaveProperty('type', 'link')
    expect(res.body).toHaveProperty('expiresAt')
    expect(res.body).toHaveProperty('cloudLink')
  })

  it('returns 201 with the created invitation for type=user', async () => {
    const res = await request(testApp.app.getHttpServer())
      .post('/api/v1/invitations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ type: 'user' })
      .expect(201)

    expect(res.body).toHaveProperty('invitationId')
    expect(res.body).toHaveProperty('type', 'user')
    expect(res.body).toHaveProperty('expiresAt')
  })

  it('returns 400 when type is missing', () => {
    return request(testApp.app.getHttpServer())
      .post('/api/v1/invitations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({})
      .expect(400)
  })

  it('returns 400 when type is invalid', () => {
    return request(testApp.app.getHttpServer())
      .post('/api/v1/invitations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ type: 'invalid' })
      .expect(400)
  })

  it('returns 403 without auth', () => {
    return request(testApp.app.getHttpServer())
      .post('/api/v1/invitations')
      .send({ type: 'link' })
      .expect(401)
  })
})
