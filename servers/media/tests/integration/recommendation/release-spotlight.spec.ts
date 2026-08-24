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
  Mirrors the artist spotlight suite: one linear story that adds and removes
  signals so exactly one reason pool is ever populated, because with several
  pools the kind picked depends on the day hash and can't be asserted.

  - Artless Album: tracks but no cover art, so never eligible
  - Fresh Find Album: the one eligible release, walked through every reason
*/
let artlessTracks: MusicTrack[] = []
let freshFindTracks: MusicTrack[] = []

const DAY = 24 * 60 * 60 * 1000
const REAL_NOW = Date.now()

let dayOffset = 0


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

// Logs the guest in and keeps the bearer token for the requests that follow
const login = async () => {
  const res = await request(testApp.app.getHttpServer())
    .post('/api/v1/auth/login')
    .set('cardinal-app', 'admin')
    .send({ userId: guestUser.userId })
    .expect(201)

  authToken = res.body.JWT
}

/* Each chapter of the story gets its own calendar day. The day's sequence is resolved once and
   replayed from storage after that, so a signal added mid-day only reaches the picks once the
   clock rolls over. The session goes with the old clock, hence the fresh login. */
const advanceDay = async () => {
  dayOffset++
  jest.spyOn(Date, 'now').mockImplementation(() => REAL_NOW + dayOffset * DAY)
  await login()
}

// Fetches the spotlight at a position of the sequence for the logged-in guest
const getSpotlight = async (position?: number) => {
  const res = await request(testApp.app.getHttpServer())
    .get('/api/v1/music/spotlight/release')
    .query(position !== undefined ? { position } : {})
    .set('Authorization', `Bearer ${authToken}`)
    .expect(200)

  return res.body.spotlight
}

beforeAll(async () => {
  testApp = await createTestApp()

  await request(testApp.app.getHttpServer())
    .post('/api/v1/setup')
    .send({ serverName: 'Release Spotlight Test Server', theme: 'dark', sendAnonymousUsageData: false })

  const userService = testApp.moduleRef.get(UserService)
  guestUser = await userService.getGuestAccount()

  await login()
})

afterAll(async () => {
  jest.restoreAllMocks()
  await destroyTestApp(testApp)
})

describe('GET /music/spotlight/release', () => {
  test('returns no spotlight for an empty library', async () => {
    expect(await getSpotlight()).toBeNull()
  })

  test('ignores releases that have no cover art to carry the hero', async () => {
    artlessTracks = await seedRelease('Artless Album', 'Artless Artist', false)

    expect(await getSpotlight()).toBeNull()
  })

  test('falls back to a library pick when the user has no listening record', async () => {
    freshFindTracks = await seedRelease('Fresh Find Album', 'Fresh Find', true)

    const spotlight = await getSpotlight()

    expect(spotlight.title).toBe('Fresh Find Album')
    expect(spotlight.musicReleaseId).toBeTruthy()
    expect(spotlight.artistName).toBe('Fresh Find')
    expect(spotlight.musicArtistId).toBeTruthy()
    expect(spotlight.reason).toEqual({ kind: 'library_pick' })
    expect(spotlight.queueType).toBe('encore')
  })

  test('spotlights an unplayed release once the user has a listening record', async () => {
    await advanceDay()

    // Plays on the ineligible release give the user a record without touching Fresh Find
    await recordPlays(artlessTracks[0], 5)

    const spotlight = await getSpotlight()

    expect(spotlight.title).toBe('Fresh Find Album')
    expect(spotlight.reason).toEqual({ kind: 'unplayed' })
    expect(spotlight.queueType).toBe('encore')
  })

  test('spotlights heavy rotation once the release racks up recent plays', async () => {
    await advanceDay()

    await recordPlays(freshFindTracks[0], 5)

    const spotlight = await getSpotlight()

    expect(spotlight.title).toBe('Fresh Find Album')
    expect(spotlight.reason).toEqual({ kind: 'heavy_rotation' })
    expect(spotlight.queueType).toBe('house_mix')
  })

  test('spotlights a recently favorited track over a light listening record', async () => {
    await advanceDay()

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

    expect(spotlight.title).toBe('Fresh Find Album')
    expect(spotlight.reason).toEqual({ kind: 'favorited_track', trackTitle: 'Fresh Find Album 2' })
    expect(spotlight.queueType).toBe('house_mix')
  })

  test('spotlights a rediscovery once a well-played release goes idle', async () => {
    await advanceDay()

    // Clear the favorite and replace the listening record with an old, heavy one
    const ratings: Repository<Rating> = testApp.moduleRef.get(getRepositoryToken(Rating))
    await ratings.remove(await ratings.find())

    const histories: Repository<MusicHistory> = testApp.moduleRef.get(getRepositoryToken(MusicHistory))
    await histories.remove(await histories.find({ where: { track: { id: freshFindTracks[0].id } } }))
    await recordPlays(freshFindTracks[0], 10, new Date(Date.now() - 100 * DAY))

    const spotlight = await getSpotlight()

    expect(spotlight.title).toBe('Fresh Find Album')
    expect(spotlight.reason.kind).toBe('rediscover')
    expect(spotlight.reason.lastPlayedAt).toBeTruthy()
    expect(spotlight.queueType).toBe('encore')
  })

  test('returns the same pick on every request within the day', async () => {
    const first = await getSpotlight()
    const second = await getSpotlight()

    expect(second).toEqual(first)
  })

  test('never repeats a release or a reason across the sequence', async () => {
    await advanceDay()

    /* Three more eligible releases, one per remaining role: Second Wind is on heavy rotation,
       Bystander has never been played, and Wallflower's single play keeps it out of every
       signal pool so only the library_pick filler can surface it. */
    const secondWindTracks = await seedRelease('Second Wind Album', 'Second Wind', true)
    await seedRelease('Bystander Album', 'Bystander', true)
    const wallflowerTracks = await seedRelease('Wallflower Album', 'Wallflower', true)
    await recordPlays(secondWindTracks[0], 5)
    await recordPlays(wallflowerTracks[0], 1)

    const sequence = [await getSpotlight(0), await getSpotlight(1), await getSpotlight(2)]

    expect(new Set(sequence.map((spotlight) => spotlight.reason.kind)))
      .toEqual(new Set(['heavy_rotation', 'rediscover', 'unplayed']))
    expect(new Set(sequence.map((spotlight) => spotlight.title)))
      .toEqual(new Set(['Second Wind Album', 'Fresh Find Album', 'Bystander Album']))
  })

  test('serves library_pick once as the final filler, then runs dry', async () => {
    const fourth = await getSpotlight(3)

    expect(fourth.title).toBe('Wallflower Album')
    expect(fourth.reason).toEqual({ kind: 'library_pick' })

    expect(await getSpotlight(4)).toBeNull()
    expect(await getSpotlight(10)).toBeNull()
  })
})
