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
import { MusicSpotlightEntry } from '../../../src/modules/recommendation/music-spotlight-entry.entity'

let testApp: TestApp
let authToken: string
let guestUser: User

/*
  The day's sequence is resolved once and replayed, so this suite runs as a story
  of calendar days: within a day the listening record is churned to prove the
  picks don't move, and the clock is rolled forward to prove they do.

  - Artless Artist: tracks but no cover art, so never eligible, and the source of
    the plays that give the guest a listening record without touching a pick
  - Steady: the one eligible artist for the first few days
*/
let artlessTracks: MusicTrack[] = []
let steadyTracks: MusicTrack[] = []

const DAY = 24 * 60 * 60 * 1000
const REAL_NOW = Date.now()

let dayOffset = 0

// Logs the guest in and keeps the bearer token for the requests that follow
const login = async () => {
  const res = await request(testApp.app.getHttpServer())
    .post('/api/v1/auth/login')
    .set('cardinal-app', 'admin')
    .send({ userId: guestUser.userId })
    .expect(201)

  authToken = res.body.JWT
}

/* Rolls the server's clock forward a calendar day. The service reads the day off Date.now(),
   so this is the same rollover a user gets by leaving the tab open overnight. The session goes
   with the old clock, hence the fresh login. */
const advanceDay = async () => {
  dayOffset++
  jest.spyOn(Date, 'now').mockImplementation(() => REAL_NOW + dayOffset * DAY)
  await login()
}

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

// Strips an artist's cover art, which is what makes them ineligible to carry a spotlight
const removeArtwork = async (artistName: string) => {
  const thumbnails: Repository<MusicReleaseThumbnail> = testApp.moduleRef.get(getRepositoryToken(MusicReleaseThumbnail))
  const rows = await thumbnails.find({ where: { release: { artist: { name: artistName } } } })

  await thumbnails.remove(rows)
}

// Fetches the spotlight at a position of the sequence for the logged-in guest
const getSpotlight = async (position?: number) => {
  const res = await request(testApp.app.getHttpServer())
    .get('/api/v1/music/spotlight/artist')
    .query(position !== undefined ? { position } : {})
    .set('Authorization', `Bearer ${authToken}`)
    .expect(200)

  return res.body.spotlight
}

const storedEntries = (): Repository<MusicSpotlightEntry> => testApp.moduleRef.get(getRepositoryToken(MusicSpotlightEntry))

beforeAll(async () => {
  testApp = await createTestApp()

  await request(testApp.app.getHttpServer())
    .post('/api/v1/setup')
    .send({ serverName: 'Spotlight Persistence Test Server', theme: 'dark', sendAnonymousUsageData: false })

  const userService = testApp.moduleRef.get(UserService)
  guestUser = await userService.getGuestAccount()

  await login()
})

afterAll(async () => {
  jest.restoreAllMocks()
  await destroyTestApp(testApp)
})

describe('daily spotlight sequences', () => {
  test('resolves the day\'s sequence on the first request', async () => {
    artlessTracks = await seedRelease('Artless Album', 'Artless Artist', false)
    steadyTracks = await seedRelease('Steady Album', 'Steady', true)

    // Plays on the ineligible artist give the guest a listening record without touching Steady
    await recordPlays(artlessTracks[0], 5)

    const spotlight = await getSpotlight()

    expect(spotlight.name).toBe('Steady')
    expect(spotlight.reason).toEqual({ kind: 'unplayed' })
    expect(await storedEntries().count()).toBeGreaterThan(0)
  })

  test('holds the pick when new plays would move it to another reason', async () => {
    // Enough plays to put Steady on heavy rotation, which would re-roll an unstored sequence
    await recordPlays(steadyTracks[0], 5)

    const spotlight = await getSpotlight()

    expect(spotlight.name).toBe('Steady')
    expect(spotlight.reason).toEqual({ kind: 'unplayed' })
  })

  test('holds the pick when a rating lands mid-day', async () => {
    const ratings: Repository<Rating> = testApp.moduleRef.get(getRepositoryToken(Rating))
    await ratings.save({
      mediaType: 'music_track',
      mediaId: steadyTracks[1].musicTrackId,
      rating: 1,
      user: guestUser,
    } as Partial<Rating>)

    const spotlight = await getSpotlight()

    expect(spotlight.name).toBe('Steady')
    expect(spotlight.reason).toEqual({ kind: 'unplayed' })
  })

  test('rolls to a fresh sequence on a new calendar day', async () => {
    await advanceDay()

    const spotlight = await getSpotlight()

    // The same signals the previous day refused to act on now shape the new day's sequence
    expect(spotlight.name).toBe('Steady')
    expect(spotlight.reason.kind).not.toBe('unplayed')
  })

  test('keeps a stored reason\'s params after the signal behind them is gone', async () => {
    /* Thin Steady's plays down to one, below the heavy rotation floor but still enough to not
       count as unplayed, so the standing favorite is the only reason left. */
    const histories: Repository<MusicHistory> = testApp.moduleRef.get(getRepositoryToken(MusicHistory))
    const rows = await histories.find({ where: { track: { id: steadyTracks[0].id } } })
    await histories.remove(rows.slice(1))

    await advanceDay()

    const spotlight = await getSpotlight()
    expect(spotlight.reason).toEqual({ kind: 'favorited_track', trackTitle: 'Steady Album 2' })

    // Unfavoriting the track can't rewrite a reason the day already committed to
    const ratings: Repository<Rating> = testApp.moduleRef.get(getRepositoryToken(Rating))
    await ratings.remove(await ratings.find())

    expect(await getSpotlight()).toEqual(spotlight)
  })

  test('replaces a pick whose media stopped being eligible, leaving the rest alone', async () => {
    /* Four unplayed artists and no other signal, so the day's sequence is two entries long
       (the unplayed pick, then the library_pick filler) with two artists to spare. */
    const histories: Repository<MusicHistory> = testApp.moduleRef.get(getRepositoryToken(MusicHistory))
    await histories.remove(await histories.find({ where: { track: { id: steadyTracks[0].id } } }))

    await seedRelease('Understudy Album', 'Understudy', true)
    await seedRelease('Standby Album', 'Standby', true)
    await seedRelease('Waiting Room Album', 'Waiting Room', true)

    await advanceDay()

    const first = await getSpotlight(0)
    const second = await getSpotlight(1)

    expect(first.reason).toEqual({ kind: 'unplayed' })
    expect(second.reason).toEqual({ kind: 'library_pick' })
    expect(await getSpotlight(2)).toBeNull()

    await removeArtwork(first.name)

    const replacement = await getSpotlight(0)

    expect(replacement.name).not.toBe(first.name)
    expect(replacement.name).not.toBe(second.name)
    expect(replacement.reason).toEqual({ kind: 'unplayed' })
    expect(await getSpotlight(1)).toEqual(second)

    // The replacement is itself stored, so it holds for the rest of the day
    expect(await getSpotlight(0)).toEqual(replacement)
  })

  test('runs each scope on its own sequence', async () => {
    const scopes = ['artist', 'release', 'track']

    for (const scope of scopes) {
      await request(testApp.app.getHttpServer())
        .get(`/api/v1/music/spotlight/${scope}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
    }

    const stored = await storedEntries().find()

    expect(new Set(stored.map((entry) => entry.scope))).toEqual(new Set(scopes))
  })

  test('keeps only the current day\'s rows', async () => {
    const today = new Date(Date.now()).toISOString().slice(0, 10)

    await advanceDay()
    await getSpotlight()

    const days = new Set((await storedEntries().find()).map((entry) => entry.day))

    expect(days.has(today)).toBe(false)
    expect(days.size).toBe(1)
  })
})
