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
  Three seeded releases:

  - Double Favorites: two favorited tracks (three days ago and one day ago)
  - Single Favorite:  one favorited track (two days ago)
  - Half Rated:       one track rated 0.5 - not a favorite

  The releases-with-favorites shelf must contain the first two exactly once
  each, ordered by their MOST RECENT favorite: Double (1d) before Single (2d).
*/
let doubleFavoritesId: string
let singleFavoriteId: string
let halfRatedReleaseId: string

// Creates one release with 3 tracks, returns [releaseId, trackIds]
const seedRelease = async (title: string): Promise<[string, string[]]> => {
  const artists: Repository<MusicArtist> = testApp.moduleRef.get(getRepositoryToken(MusicArtist))
  const releases: Repository<MusicRelease> = testApp.moduleRef.get(getRepositoryToken(MusicRelease))
  const tracks: Repository<MusicTrack> = testApp.moduleRef.get(getRepositoryToken(MusicTrack))

  const artist = await artists.save({ name: `${title} Artist` } as Partial<MusicArtist>)
  const release = await releases.save({
    title,
    artist,
    artists: [artist],
    releaseType: 'album',
  } as Partial<MusicRelease>)

  const trackIds: string[] = []

  for (let num = 1; num <= 3; num++) {
    const track = await tracks.save({
      title: `${title} ${num}`,
      trackNumber: num,
      discNumber: 1,
      duration: 200,
      release,
      artists: [artist],
    } as Partial<MusicTrack>)

    trackIds.push((await tracks.findOne({ where: { id: track.id } })).musicTrackId)
  }

  return [(await releases.findOne({ where: { id: release.id } })).musicReleaseId, trackIds]
}

// Writes a rating row for the guest user, backdated by the given number of days
const rate = async (mediaId: string, rating: number, daysAgo: number) => {
  const ratings: Repository<Rating> = testApp.moduleRef.get(getRepositoryToken(Rating))

  await ratings.save({
    mediaType: 'music_track',
    mediaId,
    rating,
    user: guestUser,
    createdAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
  } as Partial<Rating>)
}

beforeAll(async () => {
  testApp = await createTestApp()

  await request(testApp.app.getHttpServer())
    .post('/api/v1/setup')
    .send({ serverName: 'Release Favorites Test Server', theme: 'dark', sendAnonymousUsageData: false })

  const userService = testApp.moduleRef.get(UserService)
  guestUser = await userService.getGuestAccount()

  const loginRes = await request(testApp.app.getHttpServer())
    .post('/api/v1/auth/login')
    .set('cardinal-app', 'admin')
    .send({ userId: guestUser.userId })
    .expect(201)

  authToken = loginRes.body.JWT

  const [doubleId, doubleTracks] = await seedRelease('Double Favorites')
  const [singleId, singleTracks] = await seedRelease('Single Favorite')
  const [halfId, halfTracks] = await seedRelease('Half Rated')

  doubleFavoritesId = doubleId
  singleFavoriteId = singleId
  halfRatedReleaseId = halfId

  await rate(doubleTracks[0], 1, 3)
  await rate(doubleTracks[1], 1, 1)
  await rate(singleTracks[0], 1, 2)
  await rate(halfTracks[0], 0.5, 1)
}, 90000)

afterAll(async () => {
  await destroyTestApp(testApp)
})

const getReleases = async (query: Record<string, unknown>) => {
  const res = await request(testApp.app.getHttpServer())
    .get('/api/v1/music/releases')
    .query(query)
    .set('Authorization', `Bearer ${authToken}`)
    .expect(200)

  return res.body
}

describe('GET /api/v1/music/releases with favorites', () => {
  it('returns each release with a favorite exactly once', async () => {
    const [releases, count] = await getReleases({ favorites: true, take: 50 })
    const ids = releases.map((release) => release.musicReleaseId)

    expect(ids.sort()).toEqual([doubleFavoritesId, singleFavoriteId].sort())
    expect(count).toBe(2)
    expect(ids).not.toContain(halfRatedReleaseId)
  })

  it('orders by the most recent favorite in each release', async () => {
    const [releases] = await getReleases({ favorites: true, orderBy: 'favoritedAt', order: 'DESC', take: 50 })

    expect(releases.map((release) => release.musicReleaseId)).toEqual([doubleFavoritesId, singleFavoriteId])
  })

  it('implies the favorites filter when ordering by favoritedAt', async () => {
    const [releases] = await getReleases({ orderBy: 'favoritedAt', order: 'ASC', take: 50 })

    expect(releases.map((release) => release.musicReleaseId)).toEqual([singleFavoriteId, doubleFavoritesId])
  })
})
