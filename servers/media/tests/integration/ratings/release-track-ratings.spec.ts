import * as request from 'supertest'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { createTestApp, destroyTestApp, TestApp } from '../../helpers/create-app'
import { UserService } from '../../../src/modules/user/user.service'
import { RatingMediaType } from '../../../src/modules/rating/rating.entity'
import { MusicArtist } from '../../../src/modules/music-artist/music-artist.entity'
import { MusicRelease } from '../../../src/modules/music-release/music-release.entity'
import { MusicTrack } from '../../../src/modules/music-track/music-track.entity'

let testApp: TestApp
let authToken: string
let releaseId: string
const trackIds: string[] = []

beforeAll(async () => {
  testApp = await createTestApp()

  await request(testApp.app.getHttpServer())
    .post('/api/v1/setup')
    .send({ serverName: 'Release Ratings Test Server', theme: 'dark', sendAnonymousUsageData: false })

  const userService = testApp.moduleRef.get(UserService)
  const guestAccount = await userService.getGuestAccount()

  const loginRes = await request(testApp.app.getHttpServer())
    .post('/api/v1/auth/login')
    .set('cardinal-app', 'admin')
    .send({ userId: guestAccount.userId })
    .expect(201)

  authToken = loginRes.body.JWT

  const artists: Repository<MusicArtist> = testApp.moduleRef.get(getRepositoryToken(MusicArtist))
  const releases: Repository<MusicRelease> = testApp.moduleRef.get(getRepositoryToken(MusicRelease))
  const tracks: Repository<MusicTrack> = testApp.moduleRef.get(getRepositoryToken(MusicTrack))

  const artist = await artists.save({ name: 'Rated Artist' } as Partial<MusicArtist>)

  const release = await releases.save({
    title: 'Rated Album',
    artist,
    artists: [artist],
    releaseType: 'album',
  } as Partial<MusicRelease>)

  for (let num = 1; num <= 3; num++) {
    const track = await tracks.save({
      title: `Rated Album ${num}`,
      trackNumber: num,
      discNumber: 1,
      duration: 200,
      release,
      artists: [artist],
    } as Partial<MusicTrack>)

    const saved = await tracks.findOne({ where: { id: track.id } })
    trackIds.push(saved.musicTrackId)
  }

  releaseId = (await releases.findOne({ where: { id: release.id } })).musicReleaseId
}, 90000)

afterAll(async () => {
  await destroyTestApp(testApp)
})

// -------------------------------------------------------------------------
// GET /api/v1/music/release/:id?tracks=true
// -------------------------------------------------------------------------

describe('GET /api/v1/music/release/:id?tracks=true', () => {
  it('includes the current users rating on each track', async () => {
    await request(testApp.app.getHttpServer())
      .put('/api/v1/ratings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ mediaType: RatingMediaType.MUSIC_TRACK, mediaId: trackIds[0], rating: 1 })
      .expect(200)

    const res = await request(testApp.app.getHttpServer())
      .get(`/api/v1/music/release/${releaseId}`)
      .query({ tracks: true })
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    const ratedTrack = res.body.tracks.find((track) => track.musicTrackId === trackIds[0])
    const unratedTrack = res.body.tracks.find((track) => track.musicTrackId === trackIds[1])

    expect(ratedTrack.rating).toBe(1)
    expect(unratedTrack.rating).toBeNull()
  })

  it('reflects a deleted rating', async () => {
    await request(testApp.app.getHttpServer())
      .put('/api/v1/ratings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ mediaType: RatingMediaType.MUSIC_TRACK, mediaId: trackIds[2], rating: 1 })
      .expect(200)

    await request(testApp.app.getHttpServer())
      .delete(`/api/v1/ratings/${RatingMediaType.MUSIC_TRACK}/${trackIds[2]}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    const res = await request(testApp.app.getHttpServer())
      .get(`/api/v1/music/release/${releaseId}`)
      .query({ tracks: true })
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    const track = res.body.tracks.find((t) => t.musicTrackId === trackIds[2])
    expect(track.rating).toBeNull()
  })
})
