import * as request from 'supertest'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { createTestApp, destroyTestApp, TestApp } from '../../helpers/create-app'
import { UserService } from '../../../src/modules/user/user.service'
import { User } from '../../../src/modules/user/user.entity'
import { MusicArtist } from '../../../src/modules/music-artist/music-artist.entity'
import { MusicRelease } from '../../../src/modules/music-release/music-release.entity'
import { MusicTrack } from '../../../src/modules/music-track/music-track.entity'
import { Rating } from '../../../src/modules/rating/rating.entity'

let testApp: TestApp
let authToken: string
let guestUser: User

/*
  Four seeded tracks:

  - old-favorite:  rating 1, favorited two days ago
  - new-favorite:  rating 1, favorited now
  - half-rated:    rating 0.5 - rated, but not a favorite
  - unrated:       no rating row at all
*/
let oldFavoriteId: string
let newFavoriteId: string
let halfRatedId: string
let unratedId: string

// Creates one track on a shared release
const seedTrack = async (title: string, release: MusicRelease): Promise<string> => {
  const tracks: Repository<MusicTrack> = testApp.moduleRef.get(getRepositoryToken(MusicTrack))

  const track = await tracks.save({
    title,
    trackNumber: 1,
    discNumber: 1,
    duration: 200,
    release,
  } as Partial<MusicTrack>)

  return (await tracks.findOne({ where: { id: track.id } })).musicTrackId
}

// Writes a rating row for the guest user, optionally backdated
const rate = async (mediaId: string, rating: number, createdAt?: Date) => {
  const ratings: Repository<Rating> = testApp.moduleRef.get(getRepositoryToken(Rating))

  await ratings.save({
    mediaType: 'music_track',
    mediaId,
    rating,
    user: guestUser,
    ...(createdAt ? { createdAt } : {}),
  } as Partial<Rating>)
}

beforeAll(async () => {
  testApp = await createTestApp()

  await request(testApp.app.getHttpServer())
    .post('/api/v1/setup')
    .send({ serverName: 'Favorites Filter Test Server', theme: 'dark', sendAnonymousUsageData: false })

  const userService = testApp.moduleRef.get(UserService)
  guestUser = await userService.getGuestAccount()

  const loginRes = await request(testApp.app.getHttpServer())
    .post('/api/v1/auth/login')
    .set('cardinal-app', 'admin')
    .send({ userId: guestUser.userId })
    .expect(201)

  authToken = loginRes.body.JWT

  const artists: Repository<MusicArtist> = testApp.moduleRef.get(getRepositoryToken(MusicArtist))
  const releases: Repository<MusicRelease> = testApp.moduleRef.get(getRepositoryToken(MusicRelease))
  const artist = await artists.save({ name: 'Favorites Artist' } as Partial<MusicArtist>)
  const release = await releases.save({
    title: 'Favorites Album',
    artist,
    artists: [artist],
    releaseType: 'album',
  } as Partial<MusicRelease>)

  oldFavoriteId = await seedTrack('Old Favorite', release)
  newFavoriteId = await seedTrack('New Favorite', release)
  halfRatedId = await seedTrack('Half Rated', release)
  unratedId = await seedTrack('Unrated', release)

  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
  await rate(oldFavoriteId, 1, twoDaysAgo)
  await rate(newFavoriteId, 1)
  await rate(halfRatedId, 0.5)
}, 90000)

afterAll(async () => {
  await destroyTestApp(testApp)
})

const getTracks = async (query: Record<string, unknown>) => {
  const res = await request(testApp.app.getHttpServer())
    .get('/api/v1/music/tracks')
    .query(query)
    .set('Authorization', `Bearer ${authToken}`)
    .expect(200)

  return res.body
}

describe('GET /api/v1/music/tracks with favorites', () => {
  it('returns only tracks with a 100% rating', async () => {
    const [tracks, count] = await getTracks({ favorites: true, take: 50 })
    const ids = tracks.map((track) => track.musicTrackId)

    expect(ids.sort()).toEqual([oldFavoriteId, newFavoriteId].sort())
    expect(count).toBe(2)
    expect(ids).not.toContain(halfRatedId)
    expect(ids).not.toContain(unratedId)
  })

  it('orders by when the track was favorited', async () => {
    const [tracks] = await getTracks({ favorites: true, orderBy: 'favoritedAt', order: 'DESC', take: 50 })

    expect(tracks.map((track) => track.musicTrackId)).toEqual([newFavoriteId, oldFavoriteId])
  })

  it('implies the favorites filter when ordering by favoritedAt', async () => {
    const [tracks] = await getTracks({ orderBy: 'favoritedAt', order: 'ASC', take: 50 })

    expect(tracks.map((track) => track.musicTrackId)).toEqual([oldFavoriteId, newFavoriteId])
  })
})
