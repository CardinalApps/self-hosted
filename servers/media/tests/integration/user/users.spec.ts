import * as request from 'supertest'
import { TestingModule } from '@nestjs/testing'

import { UserService } from '../../../src/modules/user/user.service'
import { createTestApp, destroyTestApp, TestApp } from '../../helpers/create-app'

let testApp: TestApp
let moduleRef: TestingModule
let authToken: string
let guestUserId: string

beforeAll(async () => {
  testApp = await createTestApp()
  moduleRef = testApp.moduleRef

  // Complete setup so auth-protected endpoints are accessible
  await request(testApp.app.getHttpServer())
    .post('/api/v1/setup')
    .send({ serverName: 'Users Test Server', theme: 'dark', sendAnonymousUsageData: false })

  const userService = moduleRef.get(UserService)
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
// GET /api/v1/users/public
// -------------------------------------------------------------------------

describe('GET /api/v1/users/public', () => {
  it('returns 200 with an array of sanitized users', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/users/public')
      .expect(200)

    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThan(0)
    // Sensitive fields must not be exposed
    res.body.forEach((user: unknown) => {
      expect(user).not.toHaveProperty('password')
      expect(user).toHaveProperty('userId')
    })
  })

  it('does not require auth', () => {
    return request(testApp.app.getHttpServer())
      .get('/api/v1/users/public')
      .expect(200)
  })
})

// -------------------------------------------------------------------------
// GET /api/v1/users
// -------------------------------------------------------------------------

describe('GET /api/v1/users', () => {
  it('returns 200 with a [users, count] tuple', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body).toHaveLength(2)
    expect(Array.isArray(res.body[0])).toBe(true)
    expect(typeof res.body[1]).toBe('number')
    expect(res.body[1]).toBeGreaterThan(0)
  })

  it('returns role assignments when roles=true', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/users')
      .query({ roles: true })
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    const users = res.body[0]
    users.forEach((user: unknown) => {
      expect(user).toHaveProperty('roles')
      expect(Array.isArray((user as { roles: unknown }).roles)).toBe(true)
    })
  })

  it('returns 403 without auth', () => {
    return request(testApp.app.getHttpServer())
      .get('/api/v1/users')
      .expect(403)
  })
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

// -------------------------------------------------------------------------
// GET /api/v1/users/active
// -------------------------------------------------------------------------

describe('GET /api/v1/users/active', () => {
  it('returns 200 with an array', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/users/active')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(Array.isArray(res.body)).toBe(true)
  })

  it('returns 403 without auth', () => {
    return request(testApp.app.getHttpServer())
      .get('/api/v1/users/active')
      .expect(403)
  })
})

// -------------------------------------------------------------------------
// GET /api/v1/users/current
// -------------------------------------------------------------------------

describe('GET /api/v1/users/current', () => {
  it('returns 200 with localUser', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/users/current')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body).toHaveProperty('localUser')
    expect(res.body.localUser).toHaveProperty('userId', guestUserId)
    expect(res.body.localUser).not.toHaveProperty('password')
  })

  it('returns 403 without auth', () => {
    return request(testApp.app.getHttpServer())
      .get('/api/v1/users/current')
      .expect(403)
  })
})

// -------------------------------------------------------------------------
// GET /api/v1/users/owner
// -------------------------------------------------------------------------

describe('GET /api/v1/users/owner', () => {
  it('returns 200 with an empty object when no owner has been set', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/users/owner')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    // Fresh server set up without SSO has no server owner
    expect(res.body).toEqual({})
  })

  it('returns 403 without auth', () => {
    return request(testApp.app.getHttpServer())
      .get('/api/v1/users/owner')
      .expect(403)
  })
})

// -------------------------------------------------------------------------
// GET /api/v1/users/:id
// -------------------------------------------------------------------------

describe('GET /api/v1/users/:id', () => {
  it('returns 200 with the user for a valid id', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get(`/api/v1/users/${guestUserId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body).toHaveProperty('userId', guestUserId)
  })

  it('returns 200 with an empty object for an unknown id', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/users/nonexistent-id')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body).toEqual({})
  })

  it('returns 403 without auth', () => {
    return request(testApp.app.getHttpServer())
      .get(`/api/v1/users/${guestUserId}`)
      .expect(403)
  })
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
    const userService = moduleRef.get(UserService)
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
