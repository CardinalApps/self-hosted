import * as request from 'supertest'

import { createTestApp, destroyTestApp, TestApp } from '../../helpers/create-app'
import { UserService } from '../../../src/modules/user/user.service'

let testApp: TestApp
let authToken: string
let createdInvitationId: string

beforeAll(async () => {
  testApp = await createTestApp()

  await request(testApp.app.getHttpServer())
    .post('/api/v1/setup')
    .send({ serverName: 'Invitations Test Server', theme: 'dark', sendAnonymousUsageData: false })

  const userService = testApp.moduleRef.get(UserService)
  const guestAccount = await userService.getGuestAccount()

  const loginRes = await request(testApp.app.getHttpServer())
    .post('/api/v1/login')
    .set('cardinal-app', 'admin')
    .send({ userId: guestAccount.userId })
    .expect(201)

  authToken = loginRes.body.JWT

  const createRes = await request(testApp.app.getHttpServer())
    .post('/api/v1/invitations')
    .set('Authorization', `Bearer ${authToken}`)
    .send({ type: 'link' })

  createdInvitationId = createRes.body.invitationId
}, 90000)

afterAll(async () => {
  await destroyTestApp(testApp)
})

// -------------------------------------------------------------------------
// GET /api/v1/invitations
// -------------------------------------------------------------------------

describe('GET /api/v1/invitations', () => {
  it('returns 200 with a [invitations, count] tuple', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/invitations')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body).toHaveLength(2)
    expect(Array.isArray(res.body[0])).toBe(true)
    expect(typeof res.body[1]).toBe('number')
  })

  it('filters by type when provided', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/invitations')
      .query({ type: 'link' })
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    const [invitations] = res.body
    invitations.forEach((invitation: unknown) => {
      expect((invitation as { type: string }).type).toBe('link')
    })
  })

  it('returns 403 without auth', () => {
    return request(testApp.app.getHttpServer())
      .get('/api/v1/invitations')
      .expect(403)
  })
})

// -------------------------------------------------------------------------
// GET /api/v1/invitations/:id
// -------------------------------------------------------------------------

describe('GET /api/v1/invitations/:id', () => {
  it('returns 200 with the invitation', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get(`/api/v1/invitations/${createdInvitationId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body).toHaveProperty('invitationId', createdInvitationId)
    expect(res.body).toHaveProperty('type')
    expect(res.body).toHaveProperty('expiresAt')
  })

  it('returns 404 for a nonexistent invitation', () => {
    return request(testApp.app.getHttpServer())
      .get('/api/v1/invitations/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404)
  })

  it('returns 403 without auth', () => {
    return request(testApp.app.getHttpServer())
      .get(`/api/v1/invitations/${createdInvitationId}`)
      .expect(403)
  })
})
