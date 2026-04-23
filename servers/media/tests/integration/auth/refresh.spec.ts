import * as request from 'supertest'
import { TestingModule } from '@nestjs/testing'

import { UserService } from '../../../src/modules/user/user.service'
import { TokenService } from '../../../src/modules/auth/token.service'
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
})
