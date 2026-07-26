import * as request from 'supertest'
import { DataSource } from 'typeorm'

import { UserService } from '../../../src/modules/user/user.service'
import { DatabaseService } from '../../../src/modules/database/database.service'
import { SettingsService } from '../../../src/modules/settings/settings.service'
import { User } from '../../../src/modules/user/user.entity'
import { Library } from '../../../src/modules/library/library.entity'
import { Setting } from '../../../src/modules/settings/setting.entity'
import { OPTIONS } from '../../../src/utils/options'
import { Designations } from '../../../src/modules/user/types'
import { createTestApp, destroyTestApp, TestApp } from '../../helpers/create-app'

// -------------------------------------------------------------------------
// POST /api/v1/setup
// -------------------------------------------------------------------------

describe('POST /api/v1/setup', () => {
  let testApp: TestApp

  beforeAll(async () => {
    testApp = await createTestApp()
  }, 90000)

  afterAll(async () => {
    await destroyTestApp(testApp)
  })

  it('returns 201 with server name and accountToLogInto on a fresh server', async () => {
    const res = await request(testApp.app.getHttpServer())
      .post('/api/v1/setup')
      .send({ serverName: 'Test Server', theme: 'dark', sendAnonymousUsageData: false })
      .expect(201)

    expect(res.body).toHaveProperty('serverName', 'Test Server')
    expect(res.body).toHaveProperty('accountToLogInto')
    expect(typeof res.body.accountToLogInto).toBe('string')
  })

  it('returns 403 when called a second time', () => {
    return request(testApp.app.getHttpServer())
      .post('/api/v1/setup')
      .send({ serverName: 'Test Server', theme: 'dark', sendAnonymousUsageData: false })
      .expect(403)
  })
})

// -------------------------------------------------------------------------
// POST /api/v1/reset
// -------------------------------------------------------------------------

describe('POST /api/v1/reset', () => {
  let testApp: TestApp
  let authToken: string

  beforeAll(async () => {
    testApp = await createTestApp()

    // Complete setup so the server is in a usable state
    await request(testApp.app.getHttpServer())
      .post('/api/v1/setup')
      .send({ serverName: 'Reset Test Server', theme: 'dark', sendAnonymousUsageData: false })

    // Log into the guest account to get an auth token for subsequent requests
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
  // Auth
  // -------------------------------------------------------------------------

  it('returns 403 when no auth token is provided', () => {
    return request(testApp.app.getHttpServer())
      .post('/api/v1/reset')
      .send({ type: 'media', validationString: 'Deindex media' })
      .expect(401)
  })

  // -------------------------------------------------------------------------
  // Media reset
  // -------------------------------------------------------------------------

  describe('media reset', () => {
    it('returns 400 with an incorrect validation string', () => {
      return request(testApp.app.getHttpServer())
        .post('/api/v1/reset')
        .set('Authorization', `Bearer ${authToken}`)
        .set('cardinal-app', 'admin')
        .send({ type: 'media', validationString: 'wrong phrase' })
        .expect(400)
    })

    it('returns 400 with an unknown reset type', () => {
      return request(testApp.app.getHttpServer())
        .post('/api/v1/reset')
        .set('Authorization', `Bearer ${authToken}`)
        .set('cardinal-app', 'admin')
        .send({ type: 'everything', validationString: 'Deindex media' })
        .expect(400)
    })

    it('returns 201 on success', () => {
      return request(testApp.app.getHttpServer())
        .post('/api/v1/reset')
        .set('Authorization', `Bearer ${authToken}`)
        .set('cardinal-app', 'admin')
        .send({ type: 'media', validationString: 'Deindex media' })
        .expect(201)
    })
  })

  // -------------------------------------------------------------------------
  // Factory reset
  // -------------------------------------------------------------------------

  describe('factory reset', () => {
    it('returns 400 with an incorrect validation string', () => {
      return request(testApp.app.getHttpServer())
        .post('/api/v1/reset')
        .set('Authorization', `Bearer ${authToken}`)
        .set('cardinal-app', 'admin')
        .send({ type: 'factory', validationString: 'wrong phrase' })
        .expect(400)
    })

    it('returns 403 for a user whose roles do not include MediaServer.FactoryReset', async () => {
      const userService = testApp.moduleRef.get(UserService)
      await userService.createUser({
        dto: { username: 'listener', password: 'hunter22', role: 'music_user' },
      })

      const loginRes = await request(testApp.app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('cardinal-app', 'music')
        .send({ username: 'listener', password: 'hunter22' })
        .expect(201)

      return request(testApp.app.getHttpServer())
        .post('/api/v1/reset')
        .set('Authorization', `Bearer ${loginRes.body.JWT}`)
        .set('cardinal-app', 'music')
        .send({ type: 'factory', validationString: 'Factory reset' })
        .expect(403)
    })

    it('returns 201 and leaves the server as a fresh install', async () => {
      const dataSource = testApp.moduleRef.get(DataSource)
      const databaseService = testApp.moduleRef.get(DatabaseService)
      const settingsService = testApp.moduleRef.get(SettingsService)
      const userService = testApp.moduleRef.get(UserService)

      // Everything a used server accumulates: accounts, a library, and a setting saved
      // against one of those accounts
      const guestAccount = await userService.getGuestAccount()
      const instanceIdBefore = await databaseService.getOption(OPTIONS.INSTANCE_ID.name)
      await request(testApp.app.getHttpServer())
        .post('/api/v1/library')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'My Music', paths: ['/music'] })
        .expect(201)
      await settingsService.set(null, { theme: 'dark' }, guestAccount.userId)

      expect(await dataSource.getRepository(User).count()).toBeGreaterThan(1)
      expect(await dataSource.getRepository(Library).count()).toBe(1)

      await request(testApp.app.getHttpServer())
        .post('/api/v1/reset')
        .set('Authorization', `Bearer ${authToken}`)
        .set('cardinal-app', 'admin')
        .send({ type: 'factory', validationString: 'Factory reset' })
        .expect(201)

      // The guest account is recreated, so it is the only account left standing
      const users = await dataSource.getRepository(User).find()
      expect(users).toHaveLength(1)
      expect(users[0].designation).toBe(Designations.GUEST_ACCOUNT)
      expect(users[0].userId).not.toBe(guestAccount.userId)

      expect(await dataSource.getRepository(Library).count()).toBe(0)

      // Only the server-wide defaults are left; nothing that was saved for an account
      const settings = await dataSource.getRepository(Setting).find()
      expect(settings.length).toBeGreaterThan(0)
      expect(settings.every((setting) => setting.userId === '')).toBe(true)
      expect(settings.some((setting) => setting.name === 'server_name' && setting.value === 'Reset Test Server')).toBe(false)

      // First time setup runs again, and the claim it made is gone
      expect(await databaseService.getOption(OPTIONS.FIRST_TIME_SETUP_DONE.name)).toBe(false)
      expect(await databaseService.getOption(OPTIONS.CLAIM_ID.name)).toBeFalsy()

      /*
       * A new instance ID, because the cloud keys self-hosted claims by instance ID and never
       * releases one. Keeping the old ID would leave the server permanently unclaimable.
       */
      const instanceIdAfter = await databaseService.getOption(OPTIONS.INSTANCE_ID.name)
      expect(instanceIdAfter).toBeTruthy()
      expect(instanceIdAfter).not.toBe(instanceIdBefore)

      // The installation date is not part of what a reset undoes
      expect(await databaseService.getOption(OPTIONS.INSTALLED_AT.name)).toBeTruthy()

      const health = await request(testApp.app.getHttpServer())
        .get('/api/v1/health')
        .set('cardinal-app', 'admin')
        .expect(200)
      expect(health.body.state).toBe('not_setup')
    })
  })
})
