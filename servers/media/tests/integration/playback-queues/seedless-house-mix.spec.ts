import * as request from 'supertest'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { createTestApp, destroyTestApp, TestApp } from '../../helpers/create-app'
import { UserService } from '../../../src/modules/user/user.service'
import { User } from '../../../src/modules/user/user.entity'
import { MusicArtist } from '../../../src/modules/music-artist/music-artist.entity'
import { MusicGenre } from '../../../src/modules/music-genres/music-genre.entity'
import { MusicRelease } from '../../../src/modules/music-release/music-release.entity'
import { MusicTrack } from '../../../src/modules/music-track/music-track.entity'
import { MusicHistory } from '../../../src/modules/music-history/music-history.entity'
import { Rating } from '../../../src/modules/rating/rating.entity'

let testApp: TestApp
let authToken: string
let guestUser: User

/*
  A house_mix created without a seed picks its own: one of the user's most
  played tracks of the past week (min 3 plays), else a favorite, else random
  playback. The tests run in fallback order, adding data as they go:

  - Comfort Album (Comfort Artist, Rock): gains heavy rotation plays in test 3
  - Darling Album (Darling Artist, Pop): gains a favorite in test 2
  - Filler Album (Filler Artist, Jazz): plays that must not qualify as a seed
*/
let comfortTracks: MusicTrack[] = []
let darlingTracks: MusicTrack[] = []
let fillerTracks: MusicTrack[] = []

// Creates one release with its artist/genre relations and 5 tracks
const seedRelease = async (
  title: string,
  artistName: string,
  genreName: string,
): Promise<MusicTrack[]> => {
  const artists: Repository<MusicArtist> = testApp.moduleRef.get(getRepositoryToken(MusicArtist))
  const genres: Repository<MusicGenre> = testApp.moduleRef.get(getRepositoryToken(MusicGenre))
  const releases: Repository<MusicRelease> = testApp.moduleRef.get(getRepositoryToken(MusicRelease))
  const tracks: Repository<MusicTrack> = testApp.moduleRef.get(getRepositoryToken(MusicTrack))

  const artist = await artists.save({ name: artistName } as Partial<MusicArtist>)
  const genre = await genres.save({ name: genreName } as Partial<MusicGenre>)

  const release = await releases.save({
    title,
    artist,
    artists: [artist],
    genres: [genre],
    releaseType: 'album',
  } as Partial<MusicRelease>)

  const saved: MusicTrack[] = []

  for (let num = 1; num <= 5; num++) {
    const track = await tracks.save({
      title: `${title} ${num}`,
      trackNumber: num,
      discNumber: 1,
      duration: 200,
      release,
      artists: [artist],
    } as Partial<MusicTrack>)

    saved.push(await tracks.findOne({ where: { id: track.id } }))
  }

  return saved
}

// Writes `count` history rows for a track, optionally backdated
const recordPlays = async (track: MusicTrack, count: number, createdAt?: Date) => {
  const histories: Repository<MusicHistory> = testApp.moduleRef.get(getRepositoryToken(MusicHistory))

  for (let play = 0; play < count; play++) {
    await histories.save({
      progress: 30,
      track,
      user: guestUser,
      ...(createdAt ? { createdAt } : {}),
    } as Partial<MusicHistory>)
  }
}

// Creates a queue and returns the response body
const createQueue = async (body: Record<string, unknown>, expectStatus = 201) => {
  const res = await request(testApp.app.getHttpServer())
    .post('/api/v1/playback-queues')
    .set('Authorization', `Bearer ${authToken}`)
    .send(body)
    .expect(expectStatus)

  return res.body
}

// Returns every item of a queue, in playback order
const getItems = async (queueId: string) => {
  const res = await request(testApp.app.getHttpServer())
    .get(`/api/v1/playback-queues/${queueId}/items`)
    .query({ leading: 500, includeCurrentItemInReturn: true })
    .set('Authorization', `Bearer ${authToken}`)
    .expect(200)

  return res.body[0]
}

beforeAll(async () => {
  testApp = await createTestApp()

  await request(testApp.app.getHttpServer())
    .post('/api/v1/setup')
    .send({ serverName: 'Seedless House Mix Test Server', theme: 'dark', sendAnonymousUsageData: false })

  const userService = testApp.moduleRef.get(UserService)
  guestUser = await userService.getGuestAccount()

  const loginRes = await request(testApp.app.getHttpServer())
    .post('/api/v1/auth/login')
    .set('cardinal-app', 'admin')
    .send({ userId: guestUser.userId })
    .expect(201)

  authToken = loginRes.body.JWT

  comfortTracks = await seedRelease('Comfort Album', 'Comfort Artist', 'Rock')
  darlingTracks = await seedRelease('Darling Album', 'Darling Artist', 'Pop')
  fillerTracks = await seedRelease('Filler Album', 'Filler Artist', 'Jazz')
}, 90000)

afterAll(async () => {
  await destroyTestApp(testApp)
})

describe('seedless house_mix queues', () => {
  it('initializes with random playback when the user has no history or favorites', async () => {
    const queue = await createQueue({
      type: 'dynamic',
      dynamicType: 'house_mix',
    })

    expect(queue.dynamicType).toBe('house_mix')
    expect(queue.seedMediaId).toBeFalsy()

    const items = await getItems(queue.queueId)
    expect(items.length).toBeGreaterThan(1)
  })

  it('seeds itself with a favorite when there is no listening history', async () => {
    const ratings: Repository<Rating> = testApp.moduleRef.get(getRepositoryToken(Rating))
    const darling = darlingTracks[0]

    await ratings.save({
      mediaType: 'music_track',
      mediaId: darling.musicTrackId,
      rating: 1,
      user: guestUser,
    } as Partial<Rating>)

    const queue = await createQueue({
      type: 'dynamic',
      dynamicType: 'house_mix',
    })

    const items = await getItems(queue.queueId)
    expect(items[0].mediaId).toBe(darling.musicTrackId)
  })

  it('prefers a heavy rotation track of the past week over a favorite', async () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)

    // Only comfort[0] qualifies: filler[0] is under 3 plays, filler[1] is outside the week
    await recordPlays(comfortTracks[0], 3)
    await recordPlays(fillerTracks[0], 2)
    await recordPlays(fillerTracks[1], 5, eightDaysAgo)

    const queue = await createQueue({
      type: 'dynamic',
      dynamicType: 'house_mix',
    })

    const items = await getItems(queue.queueId)
    expect(items[0].mediaId).toBe(comfortTracks[0].musicTrackId)
  })

  it('still validates a seed when one is provided', async () => {
    await createQueue({
      type: 'dynamic',
      dynamicType: 'house_mix',
      seedMediaType: 'music_release',
      seedMediaId: 'not-a-real-release',
    }, 404)
  })
})
