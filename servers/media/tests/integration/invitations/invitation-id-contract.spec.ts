import * as request from 'supertest'
import { v4 as uuid } from 'uuid'

import { createTestApp, destroyTestApp, TestApp } from '../../helpers/create-app'
import { UserService } from '../../../src/modules/user/user.service'

let testApp: TestApp
let authToken: string

// An all-digits param that overflows the 32 bit row ID column. Postgres throws
// on an out of range comparison where SQLite simply matches nothing.
const OVERFLOWING_ROW_ID = '99999999999999999999'

const createInvitation = async (): Promise<string> => {
  const res = await request(testApp.app.getHttpServer())
    .post('/api/v1/invitations')
    .set('Authorization', `Bearer ${authToken}`)
    .send({ type: 'link' })
    .expect(201)

  return res.body.invitationId
}

beforeAll(async () => {
  testApp = await createTestApp()

  await request(testApp.app.getHttpServer())
    .post('/api/v1/setup')
    .send({ serverName: 'Invitation ID Contract Server', theme: 'dark', sendAnonymousUsageData: false })

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
// GET /api/v1/invitations/:id
// -------------------------------------------------------------------------

describe('GET /api/v1/invitations/:id', () => {
  it('returns the invitation addressed by its UUID invitation ID', async () => {
    const invitationId = await createInvitation()

    const res = await request(testApp.app.getHttpServer())
      .get(`/api/v1/invitations/${invitationId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body.invitationId).toBe(invitationId)
  })

  it('returns 404 rather than 500 for a UUID that matches no invitation', () => {
    return request(testApp.app.getHttpServer())
      .get(`/api/v1/invitations/${uuid()}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404)
  })

  it('returns 404 rather than 500 for a param that is not an invitation ID', () => {
    return request(testApp.app.getHttpServer())
      .get('/api/v1/invitations/not-an-identifier')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404)
  })

  // The param DTO is a string, so an all-digits param is compared against the
  // UUID column and never reaches the row ID column.
  it('returns 404 rather than 500 for an all-digits param', () => {
    return request(testApp.app.getHttpServer())
      .get('/api/v1/invitations/1')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404)
  })

  it('returns 404 rather than 500 for a numeric param too large to be a row ID', () => {
    return request(testApp.app.getHttpServer())
      .get(`/api/v1/invitations/${OVERFLOWING_ROW_ID}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404)
  })
})

// -------------------------------------------------------------------------
// DELETE /api/v1/invitations/:id
// -------------------------------------------------------------------------

describe('DELETE /api/v1/invitations/:id', () => {
  it('deletes the invitation addressed by its UUID invitation ID', async () => {
    const invitationId = await createInvitation()

    await request(testApp.app.getHttpServer())
      .delete(`/api/v1/invitations/${invitationId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    await request(testApp.app.getHttpServer())
      .get(`/api/v1/invitations/${invitationId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404)
  })

  it('returns 404 rather than 500 for a UUID that matches no invitation', () => {
    return request(testApp.app.getHttpServer())
      .delete(`/api/v1/invitations/${uuid()}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404)
  })

  it('returns 404 rather than 500 for a param that is not an invitation ID', () => {
    return request(testApp.app.getHttpServer())
      .delete('/api/v1/invitations/not-an-identifier')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404)
  })

  it('returns 404 rather than 500 for an all-digits param', () => {
    return request(testApp.app.getHttpServer())
      .delete('/api/v1/invitations/1')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404)
  })

  it('returns 404 rather than 500 for a numeric param too large to be a row ID', () => {
    return request(testApp.app.getHttpServer())
      .delete(`/api/v1/invitations/${OVERFLOWING_ROW_ID}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404)
  })
})
