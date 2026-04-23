import * as request from 'supertest'
import { TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { UserService } from '../../../src/modules/user/user.service'
import { CloudUserService } from '../../../src/modules/user/cloud-user.service'
import { User } from '../../../src/modules/user/user.entity'
import { TestApp, createTestApp, destroyTestApp } from '../../helpers/create-app'

/**
 * Creates a minimal JWT-shaped string that jwtDecode can parse. The cloud auth
 * server is mocked in these tests, so the signature is never verified.
 */
function buildFakeCloudJWT(payload: object): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${header}.${body}.fakesig`
}

describe('POST /api/v1/auth/login', () => {
  let testApp: TestApp
  let moduleRef: TestingModule

  beforeAll(async () => {
    testApp = await createTestApp()
    moduleRef = testApp.moduleRef
  }, 90000)

  afterAll(async () => {
    await destroyTestApp(testApp)
  })

  // -------------------------------------------------------------------------
  // No credentials
  // -------------------------------------------------------------------------

  describe('no credentials provided', () => {
    it('returns 403 when request body is empty', () => {
      return request(testApp.app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('cardinal-app', 'admin')
        .send({})
        .expect(403)
    })
  })

  // -------------------------------------------------------------------------
  // Guest account
  // -------------------------------------------------------------------------

  describe('guest account login', () => {
    it('returns 201 with JWT and user when a valid guest userId is provided', async () => {
      const userService = moduleRef.get(UserService)
      const guestAccount = await userService.getGuestAccount()

      const response = await request(testApp.app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('cardinal-app', 'admin')
        .send({ userId: guestAccount.userId })
        .expect(201)

      expect(response.body).toHaveProperty('JWT')
      expect(response.body).toHaveProperty('user')
      expect(typeof response.body.JWT).toBe('string')
      expect(response.body.JWT.length).toBeGreaterThan(0)
    })

    it('sets the httpOnly cardinal_refresh_tolkien cookie on successful login', async () => {
      const userService = moduleRef.get(UserService)
      const guestAccount = await userService.getGuestAccount()

      const response = await request(testApp.app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('cardinal-app', 'admin')
        .send({ userId: guestAccount.userId })
        .expect(201)

      const rawCookies = response.headers['set-cookie']
      const cookies: string[] = Array.isArray(rawCookies) ? rawCookies : rawCookies ? [rawCookies] : []
      const refreshCookie = cookies.find((c) => c.startsWith('cardinal_refresh_tolkien='))
      expect(refreshCookie).toBeDefined()
      expect(refreshCookie).toContain('HttpOnly')
      expect(refreshCookie).toContain('Path=/api/v1/auth')
    })

    it('returns a short-lived JWT with exp in seconds (not milliseconds)', async () => {
      const userService = moduleRef.get(UserService)
      const guestAccount = await userService.getGuestAccount()

      const response = await request(testApp.app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('cardinal-app', 'admin')
        .send({ userId: guestAccount.userId })
        .expect(201)

      const payloadBase64 = response.body.JWT.split('.')[1]
      const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString())

      // exp should be Unix seconds, not ms — a value > year 2100 in seconds
      // (which would be ~4102444800) means it was set in ms by mistake
      expect(payload.exp).toBeLessThan(4102444800)

      // The access tolkien should expire roughly 15 minutes from now
      const nowSeconds = Math.floor(Date.now() / 1000)
      expect(payload.exp).toBeGreaterThan(nowSeconds)
      expect(payload.exp).toBeLessThan(nowSeconds + 1800) // must be under 30 minutes
    })

    it('returns 403 when cardinal-app header is missing', async () => {
      const userService = moduleRef.get(UserService)
      const guestAccount = await userService.getGuestAccount()

      return request(testApp.app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ userId: guestAccount.userId })
        .expect(403)
    })

    it('returns 403 when userId does not exist', () => {
      return request(testApp.app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('cardinal-app', 'admin')
        .send({ userId: 'non-existent-user-id' })
        .expect(403)
    })

    it('returns 403 when userId belongs to a non-guest local account', async () => {
      const userService = moduleRef.get(UserService)

      const localUser = await userService.createUser({
        dto: { username: 'userid-test-user', password: 'somepassword', role: 'administrator' },
      })

      if (!localUser) throw new Error('Test setup failed: could not create local user')

      return request(testApp.app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('cardinal-app', 'admin')
        .send({ userId: localUser.userId })
        .expect(403)
    })

    it('returns 403 when the guest account is disabled', async () => {
      const userService = moduleRef.get(UserService)
      const userRepo = moduleRef.get<Repository<User>>(getRepositoryToken(User))
      const guestAccount = await userService.getGuestAccount()

      // Disable and restore the guest account around this test
      await userRepo.update({ userId: guestAccount.userId }, { enabled: false })

      try {
        await request(testApp.app.getHttpServer())
          .post('/api/v1/auth/login')
          .set('cardinal-app', 'admin')
          .send({ userId: guestAccount.userId })
          .expect(403)
      } finally {
        await userRepo.update({ userId: guestAccount.userId }, { enabled: true })
      }
    })
  })

  // -------------------------------------------------------------------------
  // Username + password
  // -------------------------------------------------------------------------

  describe('local username and password login', () => {
    beforeAll(async () => {
      const userService = moduleRef.get(UserService)
      await userService.createUser({
        dto: { username: 'localuser', password: 'correctpassword', role: 'administrator' },
      })
    })

    it('returns 201 with JWT and user on valid credentials', async () => {
      const response = await request(testApp.app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('cardinal-app', 'admin')
        .send({ username: 'localuser', password: 'correctpassword' })
        .expect(201)

      expect(response.body).toHaveProperty('JWT')
      expect(response.body).toHaveProperty('user')
      expect(typeof response.body.JWT).toBe('string')
    })

    it('returns 403 on an incorrect password', () => {
      return request(testApp.app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('cardinal-app', 'admin')
        .send({ username: 'localuser', password: 'wrongpassword' })
        .expect(403)
    })

    it('returns 403 on an unknown username', () => {
      return request(testApp.app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('cardinal-app', 'admin')
        .send({ username: 'nobody', password: 'correctpassword' })
        .expect(403)
    })

    it('returns 403 when cardinal-app header is missing', () => {
      return request(testApp.app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ username: 'localuser', password: 'correctpassword' })
        .expect(403)
    })
  })

  // -------------------------------------------------------------------------
  // Cardinal SSO
  // -------------------------------------------------------------------------

  describe('Cardinal SSO login', () => {
    const cloudUserId = 'test-cloud-user-abc123'

    const fakeCloudJWT = buildFakeCloudJWT({
      userId: cloudUserId,
      role: 'active',
      sso: true,
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      sid: 'test-session-id',
    })

    const mockCloudUser = {
      userId: cloudUserId,
      role: 'active',
      confirmedEmail: true,
      subscription: 'free',
    }

    it('creates a server owner on the first SSO login and returns 201', async () => {
      const cloudUserService = moduleRef.get(CloudUserService)
      jest.spyOn(cloudUserService, 'getCardinalCloudUser').mockResolvedValue(mockCloudUser)

      const response = await request(testApp.app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('cardinal-app', 'admin')
        .send({ cardinalJWT: fakeCloudJWT })
        .expect(201)

      expect(response.body).toHaveProperty('JWT')
      expect(response.body).toHaveProperty('user')
      expect(response.body).toHaveProperty('cloudJWT', fakeCloudJWT)
    })

    it('returns 201 when the SSO user already has a local account', async () => {
      const cloudUserService = moduleRef.get(CloudUserService)
      jest.spyOn(cloudUserService, 'getCardinalCloudUser').mockResolvedValue(mockCloudUser)

      const response = await request(testApp.app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('cardinal-app', 'admin')
        .send({ cardinalJWT: fakeCloudJWT })
        .expect(201)

      expect(response.body).toHaveProperty('JWT')
    })

    it('returns 403 when the SSO token is rejected by the cloud', async () => {
      const cloudUserService = moduleRef.get(CloudUserService)
      jest.spyOn(cloudUserService, 'getCardinalCloudUser').mockRejectedValue(
        new Error('JWT rejected by auth servers'),
      )

      return request(testApp.app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('cardinal-app', 'admin')
        .send({ cardinalJWT: 'invalid.jwt.token' })
        .expect(403)
    })

    it('returns 403 when cardinal-app header is missing', async () => {
      const cloudUserService = moduleRef.get(CloudUserService)
      jest.spyOn(cloudUserService, 'getCardinalCloudUser').mockResolvedValue(mockCloudUser)

      return request(testApp.app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ cardinalJWT: fakeCloudJWT })
        .expect(403)
    })
  })
})
