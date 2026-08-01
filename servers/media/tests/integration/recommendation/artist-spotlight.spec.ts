import * as request from 'supertest'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { createTestApp, destroyTestApp, TestApp } from '../../helpers/create-app'
import { UserService } from '../../../src/modules/user/user.service'
import { User } from '../../../src/modules/user/user.entity'
import { MusicArtist } from '../../../src/modules/music-artist/music-artist.entity'
import { MusicRelease } from '../../../src/modules/music-release/music-release.entity'
import { MusicReleaseThumbnail } from '../../../src/modules/music-release/music-release-thumbnail.entity'
import { MusicTrack } from '../../../src/modules/music-track/music-track.entity'
import { MusicHistory } from '../../../src/modules/music-history/music-history.entity'
import { Rating } from '../../../src/modules/rating/rating.entity'

let testApp: TestApp
let authToken: string
let guestUser: User

/*
  The spotlight reasons from the guest's listening record, so these tests run as
  one linear story that adds and removes signals so that exactly one reason pool
  is ever populated at a time; with several pools the kind picked depends on the
  day hash and can't be asserted.

  - Artless Artist: has tracks but no cover art, so never eligible
  - Fresh Find: the one eligible artist, walked through every reason in turn
*/
let artlessTracks: MusicTrack[] = []
let freshFindTracks: MusicTrack[] = []

const DAY = 24 * 60 * 60 * 1000

// Creates one release with 3 tracks, optionally with cover art
const seedRelease = async (title: string, artistName: string, artwork: boolean): Promise<MusicTrack[]> => {
  const artists: Repository<MusicArtist> = testApp.moduleRef.get(getRepositoryToken(MusicArtist))
  const releases: Repository<MusicRelease> = testApp.moduleRef.get(getRepositoryToken(MusicRelease))
  const thumbnails: Repository<MusicReleaseThumbnail> = testApp.moduleRef.get(getRepositoryToken(MusicReleaseThumbnail))
  const tracks: Repository<MusicTrack> = testApp.moduleRef.get(getRepositoryToken(MusicTrack))

  const artist = await artists.save({ name: artistName } as Partial<MusicArtist>)

  const release = await releases.save({
    title,
    artist,
    artists: [artist],
    releaseType: 'album',
  } as Partial<MusicRelease>)

  if (artwork) {
    await thumbnails.save({
      thumbnailId: `thumb-${title.replace(/\s/g, '-')}`,
      absolutePath: `/thumbs/${title}.webp`,
      relativeSrc: `${title}.webp`,
      size: 'small_nocrop',
      format: 'webp',
      width: 300,
      height: 300,
      bytes: 1000,
      release,
    } as Partial<MusicReleaseThumbnail>)
  }

  const saved: MusicTrack[] = []

  for (let num = 1; num <= 3; num++) {
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

// Fetches the spotlight for the logged-in guest
const getSpotlight = async () => {
  const res = await request(testApp.app.getHttpServer())
    .get('/api/v1/music/spotlight/artist')
    .set('Authorization', `Bearer ${authToken}`)
    .expect(200)

  return res.body.spotlight
}

beforeAll(async () => {
  testApp = await createTestApp()

  await request(testApp.app.getHttpServer())
    .post('/api/v1/setup')
    .send({ serverName: 'Artist Spotlight Test Server', theme: 'dark', sendAnonymousUsageData: false })

  const userService = testApp.moduleRef.get(UserService)
  guestUser = await userService.getGuestAccount()

  const loginRes = await request(testApp.app.getHttpServer())
    .post('/api/v1/auth/login')
    .set('cardinal-app', 'admin')
    .send({ userId: guestUser.userId })
    .expect(201)

  authToken = loginRes.body.JWT
})

afterAll(async () => {
  await destroyTestApp(testApp)
})

describe('GET /music/spotlight/artist', () => {
  test('returns no spotlight for an empty library', async () => {
    expect(await getSpotlight()).toBeNull()
  })

  test('ignores artists that have no cover art to carry the hero', async () => {
    artlessTracks = await seedRelease('Artless Album', 'Artless Artist', false)

    expect(await getSpotlight()).toBeNull()
  })

  test('falls back to a library pick when the user has no listening record', async () => {
    freshFindTracks = await seedRelease('Fresh Find Album', 'Fresh Find', true)

    const spotlight = await getSpotlight()

    expect(spotlight.name).toBe('Fresh Find')
    expect(spotlight.musicArtistId).toBeTruthy()
    expect(spotlight.reason).toEqual({ kind: 'library_pick' })
    expect(spotlight.queueType).toBe('house_mix')
  })

  test('spotlights an unplayed artist once the user has a listening record', async () => {
    // Plays on the ineligible artist give the user a record without touching Fresh Find
    await recordPlays(artlessTracks[0], 5)

    const spotlight = await getSpotlight()

    expect(spotlight.name).toBe('Fresh Find')
    expect(spotlight.reason).toEqual({ kind: 'unplayed' })
    expect(spotlight.queueType).toBe('undertow')
  })

  test('spotlights heavy rotation once the artist racks up recent plays', async () => {
    await recordPlays(freshFindTracks[0], 5)

    const spotlight = await getSpotlight()

    expect(spotlight.name).toBe('Fresh Find')
    expect(spotlight.reason).toEqual({ kind: 'heavy_rotation' })
    expect(spotlight.queueType).toBe('house_mix')
  })

  test('spotlights a recently favorited track over a light listening record', async () => {
    /* Thin Fresh Find's plays down to one, below the heavy rotation floor but
       still enough to not count as unplayed, then favorite one of its tracks. */
    const histories: Repository<MusicHistory> = testApp.moduleRef.get(getRepositoryToken(MusicHistory))
    const rows = await histories.find({ where: { track: { id: freshFindTracks[0].id } } })
    await histories.remove(rows.slice(1))

    const ratings: Repository<Rating> = testApp.moduleRef.get(getRepositoryToken(Rating))
    await ratings.save({
      mediaType: 'music_track',
      mediaId: freshFindTracks[1].musicTrackId,
      rating: 1,
      user: guestUser,
    } as Partial<Rating>)

    const spotlight = await getSpotlight()

    expect(spotlight.name).toBe('Fresh Find')
    expect(spotlight.reason).toEqual({ kind: 'favorited_track', trackTitle: 'Fresh Find Album 2' })
    expect(spotlight.queueType).toBe('house_mix')
  })

  test('spotlights a rediscovery once a well-played artist goes idle', async () => {
    // Clear the favorite and replace the listening record with an old, heavy one
    const ratings: Repository<Rating> = testApp.moduleRef.get(getRepositoryToken(Rating))
    await ratings.remove(await ratings.find())

    const histories: Repository<MusicHistory> = testApp.moduleRef.get(getRepositoryToken(MusicHistory))
    await histories.remove(await histories.find({ where: { track: { id: freshFindTracks[0].id } } }))
    await recordPlays(freshFindTracks[0], 10, new Date(Date.now() - 100 * DAY))

    const spotlight = await getSpotlight()

    expect(spotlight.name).toBe('Fresh Find')
    expect(spotlight.reason.kind).toBe('rediscover')
    expect(spotlight.reason.lastPlayedAt).toBeTruthy()
    expect(spotlight.queueType).toBe('undertow')
  })

  test('returns the same pick on every request within the day', async () => {
    const first = await getSpotlight()
    const second = await getSpotlight()

    expect(second).toEqual(first)
  })
})
