import * as request from 'supertest'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { createTestApp, destroyTestApp, TestApp } from '../../helpers/create-app'
import { UserService } from '../../../src/modules/user/user.service'
import { MusicTrack } from '../../../src/modules/music-track/music-track.entity'

let testApp: TestApp
let guestToken: string
let guestUserId: string
let otherToken: string
let otherUserId: string
let trackId: string

beforeAll(async () => {
  testApp = await createTestApp()

  await request(testApp.app.getHttpServer())
    .post('/api/v1/setup')
    .send({ serverName: 'Music History Test Server', theme: 'dark', sendAnonymousUsageData: false })

  const userService = testApp.moduleRef.get(UserService)
  const guestAccount = await userService.getGuestAccount()
  guestUserId = guestAccount.userId

  const guestLogin = await request(testApp.app.getHttpServer())
    .post('/api/v1/auth/login')
    .set('cardinal-app', 'admin')
    .send({ userId: guestAccount.userId })
    .expect(201)

  guestToken = guestLogin.body.JWT

  const otherUser = await userService.createUser({
    dto: { username: 'history-other', password: 'somepassword', role: 'administrator' },
  })
  otherUserId = otherUser.userId

  const otherLogin = await request(testApp.app.getHttpServer())
    .post('/api/v1/auth/login')
    .set('cardinal-app', 'admin')
    .send({ username: 'history-other', password: 'somepassword' })
    .expect(201)

  otherToken = otherLogin.body.JWT

  const tracks: Repository<MusicTrack> = testApp.moduleRef.get(getRepositoryToken(MusicTrack))
  const track = await tracks.save({
    title: 'History Track',
    trackNumber: 1,
    discNumber: 1,
    duration: 200,
  } as Partial<MusicTrack>)

  trackId = (await tracks.findOne({ where: { id: track.id } })).musicTrackId

  // One listen for each user
  await request(testApp.app.getHttpServer())
    .patch('/api/v1/music/history')
    .set('Authorization', `Bearer ${guestToken}`)
    .send({ trackId, seconds: 10, queueItemId: 'guest-queue-item' })
    .expect(200)

  await request(testApp.app.getHttpServer())
    .patch('/api/v1/music/history')
    .set('Authorization', `Bearer ${otherToken}`)
    .send({ trackId, seconds: 20, queueItemId: 'other-queue-item' })
    .expect(200)
}, 90000)

afterAll(async () => {
  await destroyTestApp(testApp)
})

// -------------------------------------------------------------------------
// GET /api/v1/music/history
// -------------------------------------------------------------------------

describe('GET /api/v1/music/history', () => {
  it('returns only the current users history entries', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/music/history')
      .set('Authorization', `Bearer ${guestToken}`)
      .expect(200)

    const [entries, count] = res.body

    expect(count).toBe(1)
    expect(entries).toHaveLength(1)
    expect(entries.every((entry) => entry.user.userId === guestUserId)).toBe(true)
  })

  it('scopes the entries to whoever is logged in', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/music/history')
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(200)

    const [entries, count] = res.body

    expect(count).toBe(1)
    expect(entries).toHaveLength(1)
    expect(entries.every((entry) => entry.user.userId === otherUserId)).toBe(true)
  })

  it('returns 401 without auth', () => {
    return request(testApp.app.getHttpServer())
      .get('/api/v1/music/history')
      .expect(401)
  })
})
