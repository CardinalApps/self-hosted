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
  Two seeded releases: one fresh (its tracks carry a recent real-world release
  date) and one stale. A fresh_release queue must contain exactly the fresh
  release's tracks in album order, and never refill.
*/
const freshAlbumTrackIds: string[] = []
const staleAlbumTrackIds: string[] = []

// Creates one release with 4 tracks, each carrying the given date metadata
const seedRelease = async (title: string, dateMetaValue: string | null): Promise<string[]> => {
  const artists: Repository<MusicArtist> = testApp.moduleRef.get(getRepositoryToken(MusicArtist))
  const releases: Repository<MusicRelease> = testApp.moduleRef.get(getRepositoryToken(MusicRelease))
  const tracks: Repository<MusicTrack> = testApp.moduleRef.get(getRepositoryToken(MusicTrack))
  const metadata: Repository<MusicTrackMetadata> = testApp.moduleRef.get(getRepositoryToken(MusicTrackMetadata))

  const artist = await artists.save({ name: `${title} Artist` } as Partial<MusicArtist>)
  const release = await releases.save({
    title,
    artist,
    artists: [artist],
    releaseType: 'album',
  } as Partial<MusicRelease>)

  const trackIds: string[] = []

  for (let num = 1; num <= 4; num++) {
    const track = await tracks.save({
      title: `${title} ${num}`,
      trackNumber: num,
      discNumber: 1,
      duration: 200,
      release,
      artists: [artist],
    } as Partial<MusicTrack>)

    if (dateMetaValue) {
      await metadata.save({ track, metaKey: 'date', metaValue: dateMetaValue } as Partial<MusicTrackMetadata>)
    }

    const saved = await tracks.findOne({ where: { id: track.id } })
    trackIds.push(saved.musicTrackId)
  }

  return trackIds
}

beforeAll(async () => {
  testApp = await createTestApp()

  await request(testApp.app.getHttpServer())
    .post('/api/v1/setup')
    .send({ serverName: 'Fresh Release Test Server', theme: 'dark', sendAnonymousUsageData: false })

  const userService = testApp.moduleRef.get(UserService)
  const guestAccount = await userService.getGuestAccount()

  const loginRes = await request(testApp.app.getHttpServer())
    .post('/api/v1/auth/login')
    .set('cardinal-app', 'admin')
    .send({ userId: guestAccount.userId })
    .expect(201)

  authToken = loginRes.body.JWT

  const recentIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  freshAlbumTrackIds.push(...await seedRelease('Fresh Album', recentIso))
  staleAlbumTrackIds.push(...await seedRelease('Stale Album', '2019-06-01'))
}, 90000)

afterAll(async () => {
  await destroyTestApp(testApp)
})

describe('fresh_release queues', () => {
  it('plays exactly one fresh release in album order, then ends', async () => {
    const createRes = await request(testApp.app.getHttpServer())
      .post('/api/v1/playback-queues')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ type: 'dynamic', dynamicType: 'fresh_release' })
      .expect(201)

    const queue = createRes.body
    expect(queue.dynamicType).toBe('fresh_release')

    const itemsRes = await request(testApp.app.getHttpServer())
      .get(`/api/v1/playback-queues/${queue.queueId}/items`)
      .query({ leading: 500, includeCurrentItemInReturn: true })
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    const mediaIds = itemsRes.body[0].map((item) => item.mediaId)

    // The whole fresh album, in track order, and nothing from the stale album
    expect(mediaIds).toEqual(freshAlbumTrackIds)

    const dynamicPlayback = testApp.moduleRef.get(DynamicPlayback)
    const appended = await dynamicPlayback.extendQueue(queue.queueId)
    expect(appended).toEqual([])
  })
})
