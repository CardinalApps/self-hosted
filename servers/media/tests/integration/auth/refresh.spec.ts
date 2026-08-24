import * as request from 'supertest'
import { TestingModule } from '@nestjs/testing'
import { JwtService } from '@nestjs/jwt'
import { UserService } from '../../../src/modules/user/user.service'
import { CloudUserService, CloudUserLookupError } from '../../../src/modules/user/cloud-user.service'
import { TokenService } from '../../../src/modules/auth/token.service'
import { AUTH_ERROR_CODE } from '../../../src/modules/auth/types'
import { TestApp, createTestApp, destroyTestApp } from '../../helpers/create-app'
import {
  findSetCookie,
  getRefreshCookieName,
  getSetCookies,
  isClearedCookie,
  OLD_SHARED_COOKIE_NAME,
} from '../../helpers/refresh-cookie'

// Stands in for the second Media Server sharing the host's cookie jar
const otherServer = new JwtService({ secret: 'another-media-servers-signing-secret' })

describe('POST /api/v1/auth/refresh', () => {
  let testApp: TestApp
  let moduleRef: TestingModule
  let cookieName: string

  beforeAll(async () => {
    testApp = await createTestApp()
    moduleRef = testApp.moduleRef
    cookieName = await getRefreshCookieName(testApp)
  }, 90000)

  afterAll(async () => {
    await destroyTestApp(testApp)
  })

  it('returns 401 when no cookie is sent', () => {
    return request(testApp.app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .expect(401)
  })

  it('returns 401 when the cookie contains an invalid tolkien', () => {
    return request(testApp.app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', `${cookieName}=not.a.valid.token`)
      .expect(401)
  })

  it('returns 201 with a new JWT when a valid refresh tolkien cookie is sent', async () => {
    const userService = moduleRef.get(UserService)
    const tokenService = moduleRef.get(TokenService)
    const guestAccount = await userService.getGuestAccount()
    const refreshTolkien = await tokenService.createRefreshToken(guestAccount.userId)

    const response = await request(testApp.app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', `${cookieName}=${refreshTolkien}`)
      .expect(201)

    expect(response.body).toHaveProperty('JWT')
    expect(typeof response.body.JWT).toBe('string')
    expect(response.body.JWT.length).toBeGreaterThan(0)
  })

  it('rotates the refresh tolkien (issues a new Set-Cookie)', async () => {
    const userService = moduleRef.get(UserService)
    const tokenService = moduleRef.get(TokenService)
    const guestAccount = await userService.getGuestAccount()
    const refreshTolkien = await tokenService.createRefreshToken(guestAccount.userId)

    // Wait 1 second so the new token has a different iat and thus a different value
    await new Promise((resolve) => setTimeout(resolve, 1100))

    const response = await request(testApp.app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', `${cookieName}=${refreshTolkien}`)
      .expect(201)

    const newRefreshCookie = findSetCookie(response, cookieName)
    expect(newRefreshCookie).toBeDefined()
    expect(newRefreshCookie).toContain('HttpOnly')

    // The new cookie value must differ from the original tolkien
    const newValue = newRefreshCookie.split(';')[0].split('=').slice(1).join('=')
    expect(newValue).not.toBe(refreshTolkien)
  })

  it('new access tolkien is accepted by a protected endpoint', async () => {
    const userService = moduleRef.get(UserService)
    const tokenService = moduleRef.get(TokenService)
    const guestAccount = await userService.getGuestAccount()
    const refreshTolkien = await tokenService.createRefreshToken(guestAccount.userId)

    const refreshResponse = await request(testApp.app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', `${cookieName}=${refreshTolkien}`)
      .expect(201)

    const newAccessToken = refreshResponse.body.JWT

    await request(testApp.app.getHttpServer())
      .get('/api/v1/users/current')
      .set('Authorization', `Bearer ${newAccessToken}`)
      .expect(200)
  })

  /*
   * Browsers key cookies by host and ignore the port, so two servers on one machine share a single
   * jar slot. Whatever this endpoint does with a tolkien it did not sign, it happens to the other
   * server's session as well.
   */
  describe('shared cookie jar', () => {
    it('names the refresh cookie after this instance', async () => {
      const userService = moduleRef.get(UserService)
      const tokenService = moduleRef.get(TokenService)
      const guestAccount = await userService.getGuestAccount()
      const refreshTolkien = await tokenService.createRefreshToken(guestAccount.userId)

      const response = await request(testApp.app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', `${cookieName}=${refreshTolkien}`)
        .expect(201)

      expect(cookieName).not.toBe(OLD_SHARED_COOKIE_NAME)

      const refreshCookie = findSetCookie(response, cookieName)
      expect(refreshCookie).toBeDefined()
      expect(refreshCookie).toContain('HttpOnly')
      expect(refreshCookie).toContain('Path=/api/v1/auth')
    })

    it('refuses another server\'s tolkien without touching any cookie', async () => {
      const foreignTolkien = otherServer.sign({ uid: 'somebody-elses-user', type: 'refresh' }, { expiresIn: '7d' })

      const response = await request(testApp.app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', `${cookieName}=${foreignTolkien}`)
        .expect(401)

      expect(getSetCookies(response)).toHaveLength(0)
    })

    /*
     * Cookies under the old shared name are left to expire on their own. A session that predates the
     * namespace therefore reads as no session at all, which costs one re-login and touches nothing.
     */
    it('does not read a cookie under the old shared name, even its own', async () => {
      const userService = moduleRef.get(UserService)
      const tokenService = moduleRef.get(TokenService)
      const guestAccount = await userService.getGuestAccount()
      const ownTolkien = await tokenService.createRefreshToken(guestAccount.userId)

      const response = await request(testApp.app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', `${OLD_SHARED_COOKIE_NAME}=${ownTolkien}`)
        .expect(401)

      const cookieless = await request(testApp.app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .expect(401)

      expect(getSetCookies(response)).toHaveLength(0)
      expect(response.body.message).toBe(cookieless.body.message)
    })

    it('does not read another server\'s cookie under the old shared name', async () => {
      const foreignTolkien = otherServer.sign({ uid: 'somebody-elses-user', type: 'refresh' }, { expiresIn: '7d' })

      const response = await request(testApp.app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', `${OLD_SHARED_COOKIE_NAME}=${foreignTolkien}`)
        .expect(401)

      expect(getSetCookies(response)).toHaveLength(0)
    })

    it('reads its own cookie while an old-name cookie sits alongside it', async () => {
      const userService = moduleRef.get(UserService)
      const tokenService = moduleRef.get(TokenService)
      const guestAccount = await userService.getGuestAccount()
      const refreshTolkien = await tokenService.createRefreshToken(guestAccount.userId)
      const foreignTolkien = otherServer.sign({ uid: 'somebody-elses-user', type: 'refresh' }, { expiresIn: '7d' })

      const response = await request(testApp.app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', [`${cookieName}=${refreshTolkien}`, `${OLD_SHARED_COOKIE_NAME}=${foreignTolkien}`])
        .expect(201)

      expect(findSetCookie(response, cookieName)).toBeDefined()
      expect(getSetCookies(response)).toHaveLength(1)
    })

    it('clears only its own namespaced cookie when its own tolkien has expired', async () => {
      const userService = moduleRef.get(UserService)
      const jwtService = moduleRef.get(JwtService)
      const guestAccount = await userService.getGuestAccount()
      const expiredTolkien = jwtService.sign({ uid: guestAccount.userId, type: 'refresh' }, { expiresIn: '-10s' })

      const response = await request(testApp.app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', `${cookieName}=${expiredTolkien}`)
        .expect(401)

      const cleared = findSetCookie(response, cookieName)
      expect(cleared).toBeDefined()
      expect(isClearedCookie(cleared)).toBe(true)
      expect(getSetCookies(response)).toHaveLength(1)
    })

    // The refusals must read the same, or the response tells a caller whose session it is holding
    it('gives the same answer for an expired tolkien and a foreign one', async () => {
      const userService = moduleRef.get(UserService)
      const jwtService = moduleRef.get(JwtService)
      const guestAccount = await userService.getGuestAccount()
      const expiredTolkien = jwtService.sign({ uid: guestAccount.userId, type: 'refresh' }, { expiresIn: '-10s' })
      const foreignTolkien = otherServer.sign({ uid: 'somebody-elses-user', type: 'refresh' }, { expiresIn: '7d' })

      const expiredResponse = await request(testApp.app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', `${cookieName}=${expiredTolkien}`)
        .expect(401)

      const foreignResponse = await request(testApp.app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', `${cookieName}=${foreignTolkien}`)
        .expect(401)

      expect(expiredResponse.body.message).toBe(foreignResponse.body.message)
    })
  })

  /*
   * A cloud-linked account's refresh is the one place the Media Server judges a cloud credential on
   * behalf of a local session. Every refusal here used to look the same to the client, which then
   * threw away the local session over a cloud problem.
   */
  describe('cloud-linked accounts', () => {
    const cloudUser = { userId: 'cloud-user-refresh', role: 'active', confirmedEmail: true, subscription: 'free' }
    let refreshTolkien: string

    // The link is only writable at insert time, so the account is created through the real path
    beforeAll(async () => {
      const userService = moduleRef.get(UserService)
      const tokenService = moduleRef.get(TokenService)
      const cloudUserService = moduleRef.get(CloudUserService)

      const linkSpy = jest.spyOn(cloudUserService, 'getCardinalCloudUser').mockResolvedValue(cloudUser)

      const linkedUser = await userService.createUser({
        dto: {
          username: 'linked-refresh-user',
          password: 'somepassword',
          role: 'administrator',
          cardinalJWT: 'linked.setup.token',
        },
      })

      linkSpy.mockRestore()

      refreshTolkien = await tokenService.createRefreshToken(linkedUser.userId)
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('names the missing cloud token in the refusal instead of failing anonymously', async () => {
      const response = await request(testApp.app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', `${cookieName}=${refreshTolkien}`)
        .expect(401)

      expect(response.body.code).toBe(AUTH_ERROR_CODE.CLOUD_TOKEN_REQUIRED)
    })

    it('refuses a cloud token the cloud itself rejected with the same code', async () => {
      const cloudUserService = moduleRef.get(CloudUserService)
      jest.spyOn(cloudUserService, 'getCardinalCloudUser').mockRejectedValue(
        new CloudUserLookupError('Invalid or expired token.', true),
      )

      const response = await request(testApp.app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', `${cookieName}=${refreshTolkien}`)
        .set('CardinalTolkien', 'a.stale.token')
        .expect(401)

      expect(response.body.code).toBe(AUTH_ERROR_CODE.CLOUD_TOKEN_REQUIRED)
    })

    // An outage is not a verdict on anybody's credentials, and must not read like one
    it('answers 503 rather than 401 when the cloud cannot be reached', async () => {
      const cloudUserService = moduleRef.get(CloudUserService)
      jest.spyOn(cloudUserService, 'getCardinalCloudUser').mockRejectedValue(
        new CloudUserLookupError('The Cardinal cloud could not be reached.', false),
      )

      const response = await request(testApp.app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', `${cookieName}=${refreshTolkien}`)
        .set('CardinalTolkien', 'a.valid.token')
        .expect(503)

      expect(response.body.code).toBe(AUTH_ERROR_CODE.CLOUD_UNAVAILABLE)
    })

    it('refuses an account the cloud will not vouch for with the cloud token code', async () => {
      const cloudUserService = moduleRef.get(CloudUserService)
      jest.spyOn(cloudUserService, 'getCardinalCloudUser').mockResolvedValue({ ...cloudUser, role: 'banned' })

      const response = await request(testApp.app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', `${cookieName}=${refreshTolkien}`)
        .set('CardinalTolkien', 'a.valid.token')
        .expect(401)

      expect(response.body.code).toBe(AUTH_ERROR_CODE.CLOUD_TOKEN_REQUIRED)
    })

    it('issues a new access tolkien when the cloud vouches for the account', async () => {
      const cloudUserService = moduleRef.get(CloudUserService)
      jest.spyOn(cloudUserService, 'getCardinalCloudUser').mockResolvedValue(cloudUser)

      const response = await request(testApp.app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', `${cookieName}=${refreshTolkien}`)
        .set('CardinalTolkien', 'a.valid.token')
        .expect(201)

      expect(typeof response.body.JWT).toBe('string')
    })
  })
})
