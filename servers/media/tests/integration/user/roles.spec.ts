import * as request from 'supertest'
import { TestingModule } from '@nestjs/testing'

import { UserService } from '../../../src/modules/user/user.service'
import { createTestApp, destroyTestApp, TestApp } from '../../helpers/create-app'

let testApp: TestApp
let moduleRef: TestingModule
let authToken: string
let guestUserId: string
let regularUserId: string

beforeAll(async () => {
  testApp = await createTestApp()
  moduleRef = testApp.moduleRef

  await request(testApp.app.getHttpServer())
    .post('/api/v1/setup')
    .send({ serverName: 'Roles Test Server', theme: 'dark', sendAnonymousUsageData: false })

  const userService = moduleRef.get(UserService)
  const guestAccount = await userService.getGuestAccount()
  guestUserId = guestAccount.userId

  // Create a regular user to assign/revoke roles on
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
      .expect(403)
  })
})
