import * as request from 'supertest'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { createTestApp, destroyTestApp, TestApp } from '../../helpers/create-app'
import { UserService } from '../../../src/modules/user/user.service'
import { RBACService } from '../../../src/modules/rbac/rbac.service'
import { DatabaseService } from '../../../src/modules/database/database.service'
import { User } from '../../../src/modules/user/user.entity'
import { OPTIONS } from '../../../src/utils/options'
import { SubscriptionTierSlug } from '@cardinalapps/products/dist/cjs/subscriptions'

let testApp: TestApp
let authToken: string

beforeAll(async () => {
  testApp = await createTestApp()

  await request(testApp.app.getHttpServer())
    .post('/api/v1/setup')
    .send({ serverName: 'Licensing Test Server', theme: 'dark', sendAnonymousUsageData: false })

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
// GET /api/v1/licensing/subscription
// -------------------------------------------------------------------------

describe('GET /api/v1/licensing/subscription', () => {
  it('returns 200 with a subscription tier object', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/licensing/subscription')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body).toHaveProperty('slug')
    expect(res.body).toHaveProperty('name')
    expect(res.body).toHaveProperty('provides')
    expect(typeof res.body.provides.seats).toBe('number')
  })

  it('defaults to the free tier when no cloud owner is set', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/licensing/subscription')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body.slug).toBe('free')
  })

  it('returns 403 without auth', () => {
    return request(testApp.app.getHttpServer())
      .get('/api/v1/licensing/subscription')
      .expect(401)
  })
})

// -------------------------------------------------------------------------
// GET /api/v1/licensing/seats
// -------------------------------------------------------------------------

describe('GET /api/v1/licensing/seats', () => {
  it('returns 200 with used and total seat counts', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/licensing/seats')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body).toHaveProperty('used')
    expect(res.body).toHaveProperty('total')
    expect(typeof res.body.used).toBe('number')
    expect(typeof res.body.total).toBe('number')
  })

  it('total reflects the free tier seat limit', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/licensing/seats')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body.total).toBe(2)
  })

  it('used seats does not count the guest account', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/licensing/seats')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body.used).toBe(0)
  })

  it('returns 403 without auth', () => {
    return request(testApp.app.getHttpServer())
      .get('/api/v1/licensing/seats')
      .expect(401)
  })
})

// -------------------------------------------------------------------------
// Seat count changes with a cloud owner
// -------------------------------------------------------------------------

describe('seat and subscription changes after a cloud owner is added', () => {
  let ownerUserId: string

  beforeAll(async () => {
    const userRepository = testApp.moduleRef.get<Repository<User>>(getRepositoryToken(User))
    const rbacService = testApp.moduleRef.get(RBACService)
    const databaseService = testApp.moduleRef.get(DatabaseService)

    // Insert a cloud user directly, bypassing the JWT validation that
    // createServerOwner() requires. The pro tier provides 20 seats.
    const ownerData: Partial<User> = {
      userId: 'test-cloud-owner',
      cardinalId: 'test-cardinal-id',
      cachedCloudUser: { subscription: SubscriptionTierSlug.PRO },
      cachedCloudUserAt: new Date(),
      enabled: true,
    }
    const savedOwner = await userRepository.save(ownerData as User)
    ownerUserId = savedOwner.userId

    await rbacService.assignRole('owner', [savedOwner])

    // Mark the server as claimed to prevent MaybeTriggerClaim middleware from
    // firing outbound HTTP requests during subsequent requests.
    await databaseService.saveOption(OPTIONS.CLAIM_ID.name, 'test-claim-id')
  })

  afterAll(async () => {
    const userRepository = testApp.moduleRef.get<Repository<User>>(getRepositoryToken(User))
    await userRepository.delete({ userId: ownerUserId })
  })

  it('subscription reflects the cloud owner pro tier', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/licensing/subscription')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body.slug).toBe('pro')
  })

  it('total seats reflects the pro tier limit', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/licensing/seats')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body.total).toBe(20)
  })

  it('used seats counts the cloud owner', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/licensing/seats')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body.used).toBe(1)
  })
})
