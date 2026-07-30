import * as request from 'supertest'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { createTestApp, destroyTestApp, TestApp } from '../../helpers/create-app'
import { UserService } from '../../../src/modules/user/user.service'
import { MusicArtist } from '../../../src/modules/music-artist/music-artist.entity'
import { MusicGenre } from '../../../src/modules/music-genres/music-genre.entity'
import { MusicRelease } from '../../../src/modules/music-release/music-release.entity'
import { MusicTrack } from '../../../src/modules/music-track/music-track.entity'

let testApp: TestApp
let authToken: string

/*
  The seeded library, from the perspective of "Seed Album" (the seed release):

  - Seed Album (Seed Artist, Metal, 5 tracks): the seed itself
  - Neighbor Album (Seed Artist, Metal, 5 tracks): related through the artist
  - Genre Album (Genre Buddy, Metal, 5 tracks): related through the genre
  - Far Album (Unrelated Artist, Jazz, 5 tracks): related through nothing

  Related picks must rank above the random fallback, so with 20 tracks total the
  Far Album tracks can only ever appear after every related track is queued.
*/
const seedAlbumTrackIds: string[] = []
const farAlbumTrackIds: string[] = []
let seedReleaseId: string

// Creates one release with its artist/genre relations and `numTracks` tracks
const seedRelease = async (
  releases: Repository<MusicRelease>,
  tracks: Repository<MusicTrack>,
  title: string,
  artist: MusicArtist,
  genre: MusicGenre,
  numTracks = 5,
): Promise<{ release: MusicRelease, trackIds: string[] }> => {
  const release = await releases.save({
    title,
    artist,
    artists: [artist],
    genres: [genre],
    releaseType: 'album',
  } as Partial<MusicRelease>)

  const trackIds: string[] = []

  for (let num = 1; num <= numTracks; num++) {
    const track = await tracks.save({
      title: `${title} ${num}`,
      trackNumber: num,
      discNumber: 1,
      duration: 200,
      release,
      artists: [artist],
    } as Partial<MusicTrack>)

    const saved = await tracks.findOne({ where: { id: track.id } })
    trackIds.push(saved.musicTrackId)
  }

  return { release: await releases.findOne({ where: { id: release.id } }), trackIds }
}

beforeAll(async () => {
  testApp = await createTestApp()

  await request(testApp.app.getHttpServer())
    .post('/api/v1/setup')
    .send({ serverName: 'Dynamic Queues Test Server', theme: 'dark', sendAnonymousUsageData: false })

  const userService = testApp.moduleRef.get(UserService)
  const guestAccount = await userService.getGuestAccount()

  const loginRes = await request(testApp.app.getHttpServer())
    .post('/api/v1/auth/login')
    .set('cardinal-app', 'admin')
    .send({ userId: guestAccount.userId })
    .expect(201)

  authToken = loginRes.body.JWT

  const artists: Repository<MusicArtist> = testApp.moduleRef.get(getRepositoryToken(MusicArtist))
  const genres: Repository<MusicGenre> = testApp.moduleRef.get(getRepositoryToken(MusicGenre))
  const releases: Repository<MusicRelease> = testApp.moduleRef.get(getRepositoryToken(MusicRelease))
  const tracks: Repository<MusicTrack> = testApp.moduleRef.get(getRepositoryToken(MusicTrack))

  const metal = await genres.save({ name: 'Metal' } as Partial<MusicGenre>)
  const jazz = await genres.save({ name: 'Jazz' } as Partial<MusicGenre>)

  const seedArtist = await artists.save({ name: 'Seed Artist' } as Partial<MusicArtist>)
  const genreBuddy = await artists.save({ name: 'Genre Buddy' } as Partial<MusicArtist>)
  const unrelatedArtist = await artists.save({ name: 'Unrelated Artist' } as Partial<MusicArtist>)

  const seedAlbum = await seedRelease(releases, tracks, 'Seed Album', seedArtist, metal)
  seedReleaseId = seedAlbum.release.musicReleaseId
  seedAlbumTrackIds.push(...seedAlbum.trackIds)

  await seedRelease(releases, tracks, 'Neighbor Album', seedArtist, metal)
  await seedRelease(releases, tracks, 'Genre Album', genreBuddy, metal)

  const farAlbum = await seedRelease(releases, tracks, 'Far Album', unrelatedArtist, jazz)
  farAlbumTrackIds.push(...farAlbum.trackIds)
}, 90000)

afterAll(async () => {
  await destroyTestApp(testApp)
})

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

// Reports playback of a queue item, which is what nudges the refill mechanism
const reportPlayback = async (item: { mediaId: string, queueItemId: string }) => {
  await request(testApp.app.getHttpServer())
    .patch('/api/v1/music/history')
    .set('Authorization', `Bearer ${authToken}`)
    .send({ trackId: item.mediaId, queueItemId: item.queueItemId, seconds: 30 })
    .expect(200)
}

// Polls a queue until its item count changes (or not, within the given window)
const waitForItemCount = async (queueId: string, predicate: (count: number) => boolean, timeoutMs = 10000) => {
  const startTime = Date.now()
  let count = (await getItems(queueId)).length

  while (Date.now() - startTime < timeoutMs) {
    count = (await getItems(queueId)).length
    if (predicate(count)) {
      return count
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }

  return count
}

// -------------------------------------------------------------------------
// POST /api/v1/playback-queues (house_mix)
// -------------------------------------------------------------------------

describe('house_mix queues', () => {
  it('creates a queue that kicks off with a track from the seed release', async () => {
    const queue = await createQueue({
      type: 'dynamic',
      dynamicType: 'house_mix',
      seedMediaType: 'music_release',
      seedMediaId: seedReleaseId,
    })

    expect(queue.dynamicType).toBe('house_mix')
    expect(queue.seedMediaId).toBe(seedReleaseId)

    const items = await getItems(queue.queueId)

    expect(items.length).toBeGreaterThan(1)
    expect(seedAlbumTrackIds).toContain(items[0].mediaId)
  })

  it('fills the mix with related tracks before falling back to anything else', async () => {
    const queue = await createQueue({
      type: 'dynamic',
      dynamicType: 'house_mix',
      seedMediaType: 'music_release',
      seedMediaId: seedReleaseId,
    })

    const items = await getItems(queue.queueId)
    const mediaIds = items.map((item) => item.mediaId)

    // No repeats in the initial batch
    expect(new Set(mediaIds).size).toBe(mediaIds.length)

    /*
      15 tracks are related to the seed release (its own album, the artist's other
      album, and the shared-genre album), so the unrelated Far Album can only appear
      after all of them.
    */
    const relatedSlice = mediaIds.slice(0, 15)
    for (const farTrackId of farAlbumTrackIds) {
      expect(relatedSlice).not.toContain(farTrackId)
    }
  })

  it('accepts a missing seed by seeding itself', async () => {
    const queue = await createQueue({ type: 'dynamic', dynamicType: 'house_mix' })
    const items = await getItems(queue.queueId)

    expect(items.length).toBeGreaterThan(1)
  })

  it('returns 404 when the seed release does not exist', async () => {
    await createQueue({
      type: 'dynamic',
      dynamicType: 'house_mix',
      seedMediaType: 'music_release',
      seedMediaId: '00000000-0000-0000-0000-000000000000',
    }, 404)
  })
})

// -------------------------------------------------------------------------
// POST /api/v1/playback-queues (encore)
// -------------------------------------------------------------------------

describe('encore queues', () => {
  it('plays the whole seed release in album order, then related tracks', async () => {
    const queue = await createQueue({
      type: 'dynamic',
      dynamicType: 'encore',
      seedMediaType: 'music_release',
      seedMediaId: seedReleaseId,
    })

    expect(queue.dynamicType).toBe('encore')

    const items = await getItems(queue.queueId)
    const mediaIds = items.map((item) => item.mediaId)

    // The album itself, front to back
    expect(mediaIds.slice(0, seedAlbumTrackIds.length)).toEqual(seedAlbumTrackIds)

    // Followed by a buffer of related tracks: artist and genre neighbors before Far Album
    expect(items.length).toBeGreaterThan(seedAlbumTrackIds.length)
    const relatedSlice = mediaIds.slice(seedAlbumTrackIds.length, 15)
    for (const farTrackId of farAlbumTrackIds) {
      expect(relatedSlice).not.toContain(farTrackId)
    }
  })

  it('returns 400 when the seed is missing', async () => {
    await createQueue({ type: 'dynamic', dynamicType: 'encore' }, 400)
  })
})

// -------------------------------------------------------------------------
// Refill: all dynamic queues generate more items near their end
// -------------------------------------------------------------------------

describe('dynamic queue refill', () => {
  it('extends a house_mix queue when playback nears the end', async () => {
    const queue = await createQueue({
      type: 'dynamic',
      dynamicType: 'house_mix',
      seedMediaType: 'music_release',
      seedMediaId: seedReleaseId,
    })

    const items = await getItems(queue.queueId)
    await reportPlayback(items[items.length - 1])

    const count = await waitForItemCount(queue.queueId, (current) => current > items.length)
    expect(count).toBeGreaterThan(items.length)
  })

  it('extends a true_shuffle queue when playback nears the end', async () => {
    const queue = await createQueue({ type: 'dynamic', dynamicType: 'true_shuffle' })

    const items = await getItems(queue.queueId)
    await reportPlayback(items[items.length - 1])

    const count = await waitForItemCount(queue.queueId, (current) => current > items.length)
    expect(count).toBeGreaterThan(items.length)
  })

  it('does not extend a queue when playback is far from the end', async () => {
    const queue = await createQueue({
      type: 'dynamic',
      dynamicType: 'encore',
      seedMediaType: 'music_release',
      seedMediaId: seedReleaseId,
    })

    const items = await getItems(queue.queueId)
    await reportPlayback(items[0])

    const count = await waitForItemCount(queue.queueId, (current) => current > items.length, 2000)
    expect(count).toBe(items.length)
  })
})

// -------------------------------------------------------------------------
// POST /api/v1/playback-queues/:id/extend (explicit items)
// -------------------------------------------------------------------------

describe('POST /api/v1/playback-queues/:id/extend with items', () => {
  const staticTrackIds = ['track-a', 'track-b', 'track-c']

  const createStaticQueue = async (): Promise<string> => {
    const queue = await createQueue({
      type: 'static',
      staticItems: staticTrackIds.map((mediaId) => ({ mediaId, mediaType: 'music_track' })),
    })
    return queue.queueId
  }

  it('appends items to the end of the queue', async () => {
    const queueId = await createStaticQueue()

    await request(testApp.app.getHttpServer())
      .post(`/api/v1/playback-queues/${queueId}/extend`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        insert: 'end',
        items: [
          { mediaId: 'track-d', mediaType: 'music_track' },
          { mediaId: 'track-e', mediaType: 'music_track' },
        ],
      })
      .expect(201)

    const items = await getItems(queueId)
    expect(items.map((item) => item.mediaId)).toEqual(['track-a', 'track-b', 'track-c', 'track-d', 'track-e'])
  })

  it('inserts items right after the most recently played item', async () => {
    const queueId = await createStaticQueue()
    const items = await getItems(queueId)

    // The user is midway through track-b
    await reportPlayback(items[1])

    await request(testApp.app.getHttpServer())
      .post(`/api/v1/playback-queues/${queueId}/extend`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        insert: 'next',
        items: [{ mediaId: 'track-d', mediaType: 'music_track' }],
      })
      .expect(201)

    const after = await getItems(queueId)
    expect(after.map((item) => item.mediaId)).toEqual(['track-a', 'track-b', 'track-d', 'track-c'])
  })

  it('returns 404 for a queue that does not exist', async () => {
    await request(testApp.app.getHttpServer())
      .post('/api/v1/playback-queues/00000000-0000-0000-0000-000000000000/extend')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ insert: 'end', items: [{ mediaId: 'track-x', mediaType: 'music_track' }] })
      .expect(404)
  })
})
