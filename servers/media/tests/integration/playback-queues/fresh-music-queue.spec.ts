import * as request from 'supertest'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { createTestApp, destroyTestApp, TestApp } from '../../helpers/create-app'
import { UserService } from '../../../src/modules/user/user.service'
import { MusicArtist } from '../../../src/modules/music-artist/music-artist.entity'
import { MusicRelease } from '../../../src/modules/music-release/music-release.entity'
import { MusicTrack } from '../../../src/modules/music-track/music-track.entity'
import { MusicTrackMetadata } from '../../../src/modules/music-track/music-track-metadata.entity'
import { DynamicPlayback } from '../../../src/modules/playback-queue/dynamic-playback-queue.service'

let testApp: TestApp
let authToken: string

/*
  Freshness comes from real-world release date metadata, not createdAt. The
  seeded tracks cover every branch of the released-since predicate:

  - fresh-full:  full date inside the window            -> fresh
  - stale-full:  full date outside the window           -> not fresh
  - fresh-year:  bare current year (optimistic Dec 31)  -> fresh
  - stale-year:  bare old year                          -> not fresh
  - no-date:     no date metadata at all                -> not fresh
*/
const freshTrackIds: string[] = []
const staleTrackIds: string[] = []

// Creates one track with the given date metadata rows
const seedTrack = async (title: string, dateMeta: Record<string, string>): Promise<string> => {
  const artists: Repository<MusicArtist> = testApp.moduleRef.get(getRepositoryToken(MusicArtist))
  const releases: Repository<MusicRelease> = testApp.moduleRef.get(getRepositoryToken(MusicRelease))
  const tracks: Repository<MusicTrack> = testApp.moduleRef.get(getRepositoryToken(MusicTrack))
  const metadata: Repository<MusicTrackMetadata> = testApp.moduleRef.get(getRepositoryToken(MusicTrackMetadata))

  const artist = await artists.save({ name: `${title} Artist` } as Partial<MusicArtist>)
  const release = await releases.save({
    title: `${title} Album`,
    artist,
    artists: [artist],
    releaseType: 'album',
  } as Partial<MusicRelease>)

  const track = await tracks.save({
    title,
    trackNumber: 1,
    discNumber: 1,
    duration: 200,
    release,
    artists: [artist],
  } as Partial<MusicTrack>)

  for (const [metaKey, metaValue] of Object.entries(dateMeta)) {
    await metadata.save({ track, metaKey, metaValue } as Partial<MusicTrackMetadata>)
  }

  const saved = await tracks.findOne({ where: { id: track.id } })
  return saved.musicTrackId
}

const isoDaysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

beforeAll(async () => {
  testApp = await createTestApp()

  await request(testApp.app.getHttpServer())
    .post('/api/v1/setup')
    .send({ serverName: 'Fresh Queue Test Server', theme: 'dark', sendAnonymousUsageData: false })

  const userService = testApp.moduleRef.get(UserService)
  const guestAccount = await userService.getGuestAccount()

  const loginRes = await request(testApp.app.getHttpServer())
    .post('/api/v1/auth/login')
    .set('cardinal-app', 'admin')
    .send({ userId: guestAccount.userId })
    .expect(201)

  authToken = loginRes.body.JWT

  const currentYear = String(new Date().getFullYear())

  freshTrackIds.push(await seedTrack('Fresh Full Date', { date: isoDaysAgo(30) }))
  freshTrackIds.push(await seedTrack('Fresh Bare Year', { year: currentYear }))
  staleTrackIds.push(await seedTrack('Stale Full Date', { date: '2019-06-01', year: '2019' }))
  staleTrackIds.push(await seedTrack('Stale Bare Year', { year: '2019' }))
  staleTrackIds.push(await seedTrack('No Date At All', {}))
}, 90000)

afterAll(async () => {
  await destroyTestApp(testApp)
})

describe('GET /api/v1/music/tracks with releasedSince', () => {
  it('returns only tracks released on or after the cutoff', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/music/tracks')
      .query({ releasedSince: isoDaysAgo(365), take: 50 })
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    const returnedIds = res.body[0].map((track) => track.musicTrackId)

    expect(returnedIds.sort()).toEqual([...freshTrackIds].sort())
  })

  it('rejects a malformed cutoff', async () => {
    await request(testApp.app.getHttpServer())
      .get('/api/v1/music/tracks')
      .query({ releasedSince: 'yesterday' })
      .set('Authorization', `Bearer ${authToken}`)
      .expect(400)
  })
})

describe('fresh queues', () => {
  it('creates a queue of exactly the fresh tracks, then ends instead of refilling', async () => {
    const createRes = await request(testApp.app.getHttpServer())
      .post('/api/v1/playback-queues')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ type: 'dynamic', dynamicType: 'fresh_music' })
      .expect(201)

    const queue = createRes.body
    expect(queue.dynamicType).toBe('fresh_music')

    const itemsRes = await request(testApp.app.getHttpServer())
      .get(`/api/v1/playback-queues/${queue.queueId}/items`)
      .query({ leading: 500, includeCurrentItemInReturn: true })
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    const mediaIds = itemsRes.body[0].map((item) => item.mediaId)

    expect(mediaIds.sort()).toEqual([...freshTrackIds].sort())
    for (const staleId of staleTrackIds) {
      expect(mediaIds).not.toContain(staleId)
    }

    // The fresh set is fully queued, so a refill must produce nothing
    const dynamicPlayback = testApp.moduleRef.get(DynamicPlayback)
    const appended = await dynamicPlayback.extendQueue(queue.queueId)
    expect(appended).toEqual([])
  })
})
