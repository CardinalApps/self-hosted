import * as request from 'supertest'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { createTestApp, destroyTestApp, TestApp } from '../../helpers/create-app'
import { UserService } from '../../../src/modules/user/user.service'
import { User } from '../../../src/modules/user/user.entity'
import { MusicArtist } from '../../../src/modules/music-artist/music-artist.entity'
import { MusicRelease } from '../../../src/modules/music-release/music-release.entity'
import { MusicTrack } from '../../../src/modules/music-track/music-track.entity'
import { MusicHistory } from '../../../src/modules/music-history/music-history.entity'

let testApp: TestApp
let authToken: string
let guestUser: User
let otherUser: User

/*
  A track is hot when the user played it through to at least 90% at least twice
  in the past 14 days. Each seeded track fails or passes on exactly one of those
  conditions:

  - hot-three:   3 full plays this week, the hottest
  - hot-two:     2 full plays this week, the floor
  - once-only:   1 full play this week, short of the play floor
  - skimmed:     3 plays this week, none past 40% of the track
  - stale:       3 full plays, all 20 days ago
  - other-users: 3 full plays this week, but by a different user
*/
let hotThreeId: string
let hotTwoId: string
let onceOnlyId: string
let skimmedId: string
let staleId: string
let otherUsersId: string

const DAY = 24 * 60 * 60 * 1000

const seedTrack = async (title: string, release: MusicRelease): Promise<MusicTrack> => {
  const tracks: Repository<MusicTrack> = testApp.moduleRef.get(getRepositoryToken(MusicTrack))

  const track = await tracks.save({
    title,
    trackNumber: 1,
    discNumber: 1,
    duration: 200,
    release,
  } as Partial<MusicTrack>)

  return await tracks.findOne({ where: { id: track.id } })
}

// Writes `count` history rows at a given playthrough fraction, optionally backdated
const play = async (track: MusicTrack, count: number, progress: number, createdAt?: Date, user?: User) => {
  const histories: Repository<MusicHistory> = testApp.moduleRef.get(getRepositoryToken(MusicHistory))

  for (let entry = 0; entry < count; entry++) {
    await histories.save({
      progress,
      track,
      user: user ?? guestUser,
      ...(createdAt ? { createdAt } : {}),
    } as Partial<MusicHistory>)
  }
}

beforeAll(async () => {
  testApp = await createTestApp()

  await request(testApp.app.getHttpServer())
    .post('/api/v1/setup')
    .send({ serverName: 'Hot Filter Test Server', theme: 'dark', sendAnonymousUsageData: false })

  const userService = testApp.moduleRef.get(UserService)
  guestUser = await userService.getGuestAccount()
  const users: Repository<User> = testApp.moduleRef.get(getRepositoryToken(User))
  otherUser = await users.save({ userId: 'hot-filter-other-user', username: 'hotfilter' } as Partial<User>)

  const loginRes = await request(testApp.app.getHttpServer())
    .post('/api/v1/auth/login')
    .set('cardinal-app', 'admin')
    .send({ userId: guestUser.userId })
    .expect(201)

  authToken = loginRes.body.JWT

  const artists: Repository<MusicArtist> = testApp.moduleRef.get(getRepositoryToken(MusicArtist))
  const releases: Repository<MusicRelease> = testApp.moduleRef.get(getRepositoryToken(MusicRelease))
  const artist = await artists.save({ name: 'Hot Artist' } as Partial<MusicArtist>)
  const release = await releases.save({
    title: 'Hot Album',
    artist,
    artists: [artist],
    releaseType: 'album',
  } as Partial<MusicRelease>)

  const hotThree = await seedTrack('Hot Three', release)
  const hotTwo = await seedTrack('Hot Two', release)
  const onceOnly = await seedTrack('Once Only', release)
  const skimmed = await seedTrack('Skimmed', release)
  const stale = await seedTrack('Stale', release)
  const otherUsers = await seedTrack('Other Users', release)

  hotThreeId = hotThree.musicTrackId
  hotTwoId = hotTwo.musicTrackId
  onceOnlyId = onceOnly.musicTrackId
  skimmedId = skimmed.musicTrackId
  staleId = stale.musicTrackId
  otherUsersId = otherUsers.musicTrackId

  const twentyDaysAgo = new Date(Date.now() - 20 * DAY)

  await play(hotThree, 3, 1)
  await play(hotTwo, 2, 0.92)
  await play(onceOnly, 1, 1)
  await play(skimmed, 3, 0.4)
  await play(stale, 3, 1, twentyDaysAgo)
  await play(otherUsers, 3, 1, undefined, otherUser)
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

describe('GET /api/v1/music/tracks with hot', () => {
  it('returns only tracks played through twice or more in the window', async () => {
    const [tracks, count] = await getTracks({ hot: true, take: 50 })
    const ids = tracks.map((track) => track.musicTrackId)

    expect(ids.sort()).toEqual([hotThreeId, hotTwoId].sort())
    expect(count).toBe(2)
  })

  it('leaves out tracks that miss a single condition', async () => {
    const [tracks] = await getTracks({ hot: true, take: 50 })
    const ids = tracks.map((track) => track.musicTrackId)

    expect(ids).not.toContain(onceOnlyId)
    expect(ids).not.toContain(skimmedId)
    expect(ids).not.toContain(staleId)
    expect(ids).not.toContain(otherUsersId)
  })

  it('orders by how many times the track was played through', async () => {
    const [tracks] = await getTracks({ hot: true, orderBy: 'hotPlays', order: 'DESC', take: 50 })

    expect(tracks.map((track) => track.musicTrackId)).toEqual([hotThreeId, hotTwoId])
  })

  it('implies the hot filter when ordering by hotPlays', async () => {
    const [tracks] = await getTracks({ orderBy: 'hotPlays', order: 'ASC', take: 50 })

    expect(tracks.map((track) => track.musicTrackId)).toEqual([hotTwoId, hotThreeId])
  })
})
