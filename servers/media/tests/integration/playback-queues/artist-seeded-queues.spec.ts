import * as request from 'supertest'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { createTestApp, destroyTestApp, TestApp } from '../../helpers/create-app'
import { UserService } from '../../../src/modules/user/user.service'
import { MusicArtist } from '../../../src/modules/music-artist/music-artist.entity'
import { MusicGenre } from '../../../src/modules/music-genres/music-genre.entity'
import { MusicRelease } from '../../../src/modules/music-release/music-release.entity'
import { MusicTrack } from '../../../src/modules/music-track/music-track.entity'
import { MusicHistory } from '../../../src/modules/music-history/music-history.entity'
import { User } from '../../../src/modules/user/user.entity'

let testApp: TestApp
let authToken: string
let guest: User
let artistId: string

/*
  One artist with two albums, from the perspective of the user's history:

  - Worn Album (3 tracks): every track played several times
  - Buried Album (3 tracks): never played

  The Depths must surface the Buried Album before anything off the Worn Album.
*/
const wornTrackIds: string[] = []
const buriedTrackIds: string[] = []

beforeAll(async () => {
  testApp = await createTestApp()

  await request(testApp.app.getHttpServer())
    .post('/api/v1/setup')
    .send({ serverName: 'Artist Seeded Queues Test Server', theme: 'dark', sendAnonymousUsageData: false })

  const userService = testApp.moduleRef.get(UserService)
  guest = await userService.getGuestAccount()

  const loginRes = await request(testApp.app.getHttpServer())
    .post('/api/v1/auth/login')
    .set('cardinal-app', 'admin')
    .send({ userId: guest.userId })
    .expect(201)

  authToken = loginRes.body.JWT

  const artists: Repository<MusicArtist> = testApp.moduleRef.get(getRepositoryToken(MusicArtist))
  const genres: Repository<MusicGenre> = testApp.moduleRef.get(getRepositoryToken(MusicGenre))
  const releases: Repository<MusicRelease> = testApp.moduleRef.get(getRepositoryToken(MusicRelease))
  const tracks: Repository<MusicTrack> = testApp.moduleRef.get(getRepositoryToken(MusicTrack))
  const history: Repository<MusicHistory> = testApp.moduleRef.get(getRepositoryToken(MusicHistory))

  const metal = await genres.save({ name: 'Metal' } as Partial<MusicGenre>)
  const artist = await artists.save({ name: 'Depth Artist' } as Partial<MusicArtist>)

  const seedAlbum = async (title: string, collect: string[]) => {
    const release = await releases.save({
      title,
      artist,
      artists: [artist],
      genres: [metal],
      releaseType: 'album',
    } as Partial<MusicRelease>)

    for (let num = 1; num <= 3; num++) {
      const track = await tracks.save({
        title: `${title} ${num}`,
        trackNumber: num,
        discNumber: 1,
        duration: 200,
        release,
        artists: [artist],
      } as Partial<MusicTrack>)

      collect.push((await tracks.findOne({ where: { id: track.id } })).musicTrackId)
    }
  }

  await seedAlbum('Worn Album', wornTrackIds)
  await seedAlbum('Buried Album', buriedTrackIds)

  artistId = (await artists.findOne({ where: { id: artist.id } })).musicArtistId

  for (const musicTrackId of wornTrackIds) {
    const track = await tracks.findOne({ where: { musicTrackId } })
    await history.save([
      { track, user: guest, progress: 1 },
      { track, user: guest, progress: 1 },
      { track, user: guest, progress: 0.7 },
    ] as Partial<MusicHistory>[])
  }
}, 90000)

afterAll(async () => {
  await destroyTestApp(testApp)
})

const createQueue = async (body: Record<string, unknown>, expectStatus = 201) => {
  const res = await request(testApp.app.getHttpServer())
    .post('/api/v1/playback-queues')
    .set('Authorization', `Bearer ${authToken}`)
    .send(body)
    .expect(expectStatus)

  return res.body
}

const getItems = async (queueId: string) => {
  const res = await request(testApp.app.getHttpServer())
    .get(`/api/v1/playback-queues/${queueId}/items`)
    .query({ leading: 500, includeCurrentItemInReturn: true })
    .set('Authorization', `Bearer ${authToken}`)
    .expect(200)

  return res.body[0]
}

// -------------------------------------------------------------------------
// POST /api/v1/playback-queues (music_artist seeds)
// -------------------------------------------------------------------------

describe('artist seeded queues', () => {
  it('accepts an artist as a house_mix seed', async () => {
    const queue = await createQueue({
      type: 'dynamic',
      dynamicType: 'house_mix',
      seedMediaType: 'music_artist',
      seedMediaId: artistId,
    })

    expect(queue.seedMediaType).toBe('music_artist')
    expect(queue.seedMediaId).toBe(artistId)

    const items = await getItems(queue.queueId)
    const artistTrackIds = [...wornTrackIds, ...buriedTrackIds]

    expect(items.length).toBeGreaterThan(1)
    expect(artistTrackIds).toContain(items[0].mediaId)
  })

  it('rejects a seeded queue with no seed', async () => {
    await createQueue({
      type: 'dynamic',
      dynamicType: 'the_depths',
    }, 400)
  })

  it('rejects an artist seed that does not exist', async () => {
    await createQueue({
      type: 'dynamic',
      dynamicType: 'the_depths',
      seedMediaType: 'music_artist',
      seedMediaId: 'de1e7ed0-0000-4000-8000-000000000000',
    }, 404)
  })
})

// -------------------------------------------------------------------------
// POST /api/v1/playback-queues (the_depths)
// -------------------------------------------------------------------------

describe('the_depths queues', () => {
  it('queues the artists least played tracks first', async () => {
    const queue = await createQueue({
      type: 'dynamic',
      dynamicType: 'the_depths',
      seedMediaType: 'music_artist',
      seedMediaId: artistId,
    })

    expect(queue.dynamicType).toBe('the_depths')

    const items = await getItems(queue.queueId)
    const mediaIds = items.map((item) => item.mediaId)

    // The three unplayed tracks come before any of the worn ones
    expect(mediaIds.slice(0, 3).sort()).toEqual([...buriedTrackIds].sort())

    for (const wornTrackId of wornTrackIds) {
      expect(mediaIds.indexOf(wornTrackId)).toBeGreaterThan(2)
    }
  })

  it('never repeats a track within the initial batch', async () => {
    const queue = await createQueue({
      type: 'dynamic',
      dynamicType: 'the_depths',
      seedMediaType: 'music_artist',
      seedMediaId: artistId,
    })

    const mediaIds = (await getItems(queue.queueId)).map((item) => item.mediaId)
    expect(new Set(mediaIds).size).toBe(mediaIds.length)
  })

  it('works from a release seed as well as an artist seed', async () => {
    const releases: Repository<MusicRelease> = testApp.moduleRef.get(getRepositoryToken(MusicRelease))
    const buriedRelease = await releases.findOne({ where: { title: 'Buried Album' } })

    const queue = await createQueue({
      type: 'dynamic',
      dynamicType: 'the_depths',
      seedMediaType: 'music_release',
      seedMediaId: buriedRelease.musicReleaseId,
    })

    const mediaIds = (await getItems(queue.queueId)).map((item) => item.mediaId)

    expect(mediaIds.length).toBe(buriedTrackIds.length)
    expect(mediaIds.sort()).toEqual([...buriedTrackIds].sort())
  })
})
