import * as request from 'supertest'
import { TestingModule } from '@nestjs/testing'
import { UserService } from '../../../src/modules/user/user.service'
import { CloudUserService, CloudUserLookupError } from '../../../src/modules/user/cloud-user.service'
import { TokenService } from '../../../src/modules/auth/token.service'
import { AUTH_ERROR_CODE } from '../../../src/modules/auth/types'
import { TestApp, createTestApp, destroyTestApp } from '../../helpers/create-app'

describe('POST /api/v1/auth/refresh', () => {
  let testApp: TestApp
  let moduleRef: TestingModule

  beforeAll(async () => {
    testApp = await createTestApp()
    moduleRef = testApp.moduleRef
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
      .set('Cookie', 'cardinal_refresh_tolkien=not.a.valid.token')
      .expect(401)
  })

  it('returns 201 with a new JWT when a valid refresh tolkien cookie is sent', async () => {
    const userService = moduleRef.get(UserService)
    const tokenService = moduleRef.get(TokenService)
    const guestAccount = await userService.getGuestAccount()
    const refreshTolkien = await tokenService.createRefreshToken(guestAccount.userId)

    const response = await request(testApp.app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', `cardinal_refresh_tolkien=${refreshTolkien}`)
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
      .set('Cookie', `cardinal_refresh_tolkien=${refreshTolkien}`)
      .expect(201)

    const rawCookies = response.headers['set-cookie']
    const cookies: string[] = Array.isArray(rawCookies) ? rawCookies : rawCookies ? [rawCookies] : []
    const newRefreshCookie = cookies.find((c) => c.startsWith('cardinal_refresh_tolkien='))
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
      .set('Cookie', `cardinal_refresh_tolkien=${refreshTolkien}`)
      .expect(201)

    const newAccessToken = refreshResponse.body.JWT

    await request(testApp.app.getHttpServer())
      .get('/api/v1/users/current')
      .set('Authorization', `Bearer ${newAccessToken}`)
      .expect(200)
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
        .set('Cookie', `cardinal_refresh_tolkien=${refreshTolkien}`)
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
        .set('Cookie', `cardinal_refresh_tolkien=${refreshTolkien}`)
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
        .set('Cookie', `cardinal_refresh_tolkien=${refreshTolkien}`)
        .set('CardinalTolkien', 'a.valid.token')
        .expect(503)

      expect(response.body.code).toBe(AUTH_ERROR_CODE.CLOUD_UNAVAILABLE)
    })

    it('refuses an account the cloud will not vouch for with the cloud token code', async () => {
      const cloudUserService = moduleRef.get(CloudUserService)
      jest.spyOn(cloudUserService, 'getCardinalCloudUser').mockResolvedValue({ ...cloudUser, role: 'banned' })

      const response = await request(testApp.app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', `cardinal_refresh_tolkien=${refreshTolkien}`)
        .set('CardinalTolkien', 'a.valid.token')
        .expect(401)

      expect(response.body.code).toBe(AUTH_ERROR_CODE.CLOUD_TOKEN_REQUIRED)
    })

    it('issues a new access tolkien when the cloud vouches for the account', async () => {
      const cloudUserService = moduleRef.get(CloudUserService)
      jest.spyOn(cloudUserService, 'getCardinalCloudUser').mockResolvedValue(cloudUser)

      const response = await request(testApp.app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', `cardinal_refresh_tolkien=${refreshTolkien}`)
        .set('CardinalTolkien', 'a.valid.token')
        .expect(201)

      expect(typeof response.body.JWT).toBe('string')
    })
  })
})
