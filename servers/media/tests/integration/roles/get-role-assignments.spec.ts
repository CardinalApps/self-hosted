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
    .send({ serverName: 'Roles Test Server', theme: 'dark', sendAnonymousUsageData: false })

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
// GET /api/v1/roles/assignments
// -------------------------------------------------------------------------

describe('GET /api/v1/roles/assignments', () => {
  it('returns 200 with a [assignments, count] tuple', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/roles/assignments')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body).toHaveLength(2)
    expect(Array.isArray(res.body[0])).toBe(true)
    expect(typeof res.body[1]).toBe('number')
  })

  it('filters by userId when provided', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/roles/assignments')
      .query({ userId: guestUserId })
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    const [assignments] = res.body
    assignments.forEach((assignment: unknown) => {
      expect((assignment as { user: { userId: string } }).user.userId).toBe(guestUserId)
    })
  })

  it('returns 400 for an invalid userId', () => {
    return request(testApp.app.getHttpServer())
      .get('/api/v1/roles/assignments')
      .query({ userId: 'nonexistent-id' })
      .set('Authorization', `Bearer ${authToken}`)
      .expect(400)
  })

  it('returns 403 without auth', () => {
    return request(testApp.app.getHttpServer())
      .get('/api/v1/roles/assignments')
      .expect(403)
  })
})
