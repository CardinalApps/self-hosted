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
// DELETE /api/v1/invitations/:id
// -------------------------------------------------------------------------

describe('DELETE /api/v1/invitations/:id', () => {
  it('returns 200 and deletes the invitation', async () => {
    // Create a fresh invitation to delete
    const createRes = await request(testApp.app.getHttpServer())
      .post('/api/v1/invitations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ type: 'link' })
      .expect(201)

    const idToDelete = createRes.body.invitationId

    await request(testApp.app.getHttpServer())
      .delete(`/api/v1/invitations/${idToDelete}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    // Confirm it's gone
    await request(testApp.app.getHttpServer())
      .get(`/api/v1/invitations/${idToDelete}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404)
  })

  it('returns 403 without auth', () => {
    return request(testApp.app.getHttpServer())
      .delete(`/api/v1/invitations/${createdInvitationId}`)
      .expect(403)
  })
})
