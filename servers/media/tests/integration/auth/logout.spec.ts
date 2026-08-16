import * as request from 'supertest'
import { JwtService } from '@nestjs/jwt'

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

describe('POST /api/v1/auth/logout', () => {
  let testApp: TestApp
  let cookieName: string

  beforeAll(async () => {
    testApp = await createTestApp()
    cookieName = await getRefreshCookieName(testApp)
  }, 90000)

  afterAll(async () => {
    await destroyTestApp(testApp)
  })

  it('returns 201', () => {
    return request(testApp.app.getHttpServer())
      .post('/api/v1/auth/logout')
      .expect(201)
  })

  it('clears this instance\'s refresh tolkien cookie', async () => {
    const response = await request(testApp.app.getHttpServer())
      .post('/api/v1/auth/logout')
      .expect(201)

    const cleared = findSetCookie(response, cookieName)
    expect(cleared).toBeDefined()
    expect(isClearedCookie(cleared)).toBe(true)
    expect(cleared).toContain('Path=/api/v1/auth')
  })

  // Logging out of this server must not log the user out of the one next door
  it('leaves the old shared cookie slot alone', async () => {
    const foreignTolkien = otherServer.sign({ uid: 'somebody-elses-user', type: 'refresh' }, { expiresIn: '7d' })

    const response = await request(testApp.app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Cookie', `${OLD_SHARED_COOKIE_NAME}=${foreignTolkien}`)
      .expect(201)

    expect(findSetCookie(response, OLD_SHARED_COOKIE_NAME)).toBeUndefined()
    expect(getSetCookies(response)).toHaveLength(1)
    expect(findSetCookie(response, cookieName)).toBeDefined()
  })
})
