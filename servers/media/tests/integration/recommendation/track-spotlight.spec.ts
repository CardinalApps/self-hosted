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
  Mirrors the artist and release spotlight suites: one linear story that adds and
  removes signals so exactly one reason pool is ever populated, because with
  several pools the kind picked depends on the day hash and can't be asserted.

  A track spotlight leans on its release's cover for the hero, so a track on an
  artless release can never be picked.
*/
let artlessTracks: MusicTrack[] = []
let freshFindTracks: MusicTrack[] = []

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
      progress: 1,
      track,
      user: guestUser,
      ...(createdAt ? { createdAt } : {}),
    } as Partial<MusicHistory>)
  }
}

// Fetches the spotlight at a position of the sequence for the logged-in guest
const getSpotlight = async (position?: number) => {
  const res = await request(testApp.app.getHttpServer())
    .get('/api/v1/music/spotlight/track')
    .query(position !== undefined ? { position } : {})
    .set('Authorization', `Bearer ${authToken}`)
    .expect(200)

  return res.body.spotlight
}

beforeAll(async () => {
  testApp = await createTestApp()

  await request(testApp.app.getHttpServer())
    .post('/api/v1/setup')
    .send({ serverName: 'Track Spotlight Test Server', theme: 'dark', sendAnonymousUsageData: false })

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

describe('GET /music/spotlight/track', () => {
  test('returns no spotlight for an empty library', async () => {
    expect(await getSpotlight()).toBeNull()
  })

  test('ignores tracks whose release has no cover art to carry the hero', async () => {
    artlessTracks = await seedRelease('Artless Album', 'Artless Artist', false)

    expect(await getSpotlight()).toBeNull()
  })

  test('falls back to a library pick when the user has no listening record', async () => {
    freshFindTracks = await seedRelease('Fresh Find Album', 'Fresh Find', true)

    const spotlight = await getSpotlight()

    expect(spotlight.musicTrackId).toBeTruthy()
    expect(spotlight.title).toMatch(/^Fresh Find Album/)
    expect(spotlight.artistName).toBe('Fresh Find')
    expect(spotlight.releaseTitle).toBe('Fresh Find Album')
    expect(spotlight.musicReleaseId).toBeTruthy()
    expect(spotlight.reason).toEqual({ kind: 'library_pick' })
  })

  test('spotlights an unheard track once the user has a listening record', async () => {
    // Plays on the ineligible release give the user a record without touching Fresh Find
    await recordPlays(artlessTracks[0], 3)

    const spotlight = await getSpotlight()

    expect(spotlight.title).toMatch(/^Fresh Find Album/)
    expect(spotlight.reason).toEqual({ kind: 'unplayed' })
  })

  test('spotlights the past week\'s heavy rotation', async () => {
    /* Three plays of one track this week clears the track floor; the other two tracks on the
       release stay unplayed, so both pools are populated and only the played one can carry
       heavy_rotation. */
    await recordPlays(freshFindTracks[0], 3)

    const sequence = [await getSpotlight(0), await getSpotlight(1)]
    const heavyRotation = sequence.find((spotlight) => spotlight.reason.kind === 'heavy_rotation')

    expect(heavyRotation).toBeTruthy()
    expect(heavyRotation.title).toBe('Fresh Find Album 1')
  })

  test('does not count plays from before the past week', async () => {
    const histories: Repository<MusicHistory> = testApp.moduleRef.get(getRepositoryToken(MusicHistory))
    await histories.remove(await histories.find({ where: { track: { id: freshFindTracks[0].id } } }))
    await recordPlays(freshFindTracks[0], 3, new Date(Date.now() - 10 * 24 * 60 * 60 * 1000))

    const sequence = [await getSpotlight(0), await getSpotlight(1)]

    expect(sequence.map((spotlight) => spotlight.reason.kind)).not.toContain('heavy_rotation')
  })

  test('spotlights a recently favorited track', async () => {
    /* One old play keeps the favorite out of the unplayed pool, without putting it anywhere near
       the weekly heavy rotation floor. A track in both pools can be drawn as the unplayed pick,
       which empties the favorited pool before it is ever reached. */
    await recordPlays(freshFindTracks[1], 1, new Date(Date.now() - 10 * 24 * 60 * 60 * 1000))

    const ratings: Repository<Rating> = testApp.moduleRef.get(getRepositoryToken(Rating))
    await ratings.save({
      mediaType: 'music_track',
      mediaId: freshFindTracks[1].musicTrackId,
      rating: 1,
      user: guestUser,
    } as Partial<Rating>)

    const sequence = [await getSpotlight(0), await getSpotlight(1), await getSpotlight(2)]
    const favorited = sequence.find((spotlight) => spotlight?.reason.kind === 'favorited_track')

    expect(favorited).toBeTruthy()
    expect(favorited.title).toBe('Fresh Find Album 2')
    // The pick is the favorite itself, so naming the track in the reason would be redundant
    expect(favorited.reason).toEqual({ kind: 'favorited_track' })
  })

  test('returns the same pick on every request within the day', async () => {
    const first = await getSpotlight()
    const second = await getSpotlight()

    expect(second).toEqual(first)
  })

  test('never repeats a track or a reason across the sequence', async () => {
    const sequence = [await getSpotlight(0), await getSpotlight(1), await getSpotlight(2)]
    const kinds = sequence.map((spotlight) => spotlight.reason.kind)
    const ids = sequence.map((spotlight) => spotlight.musicTrackId)

    expect(new Set(kinds).size).toBe(kinds.length)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test('runs dry once every reason has been served', async () => {
    expect(await getSpotlight(10)).toBeNull()
  })
})
