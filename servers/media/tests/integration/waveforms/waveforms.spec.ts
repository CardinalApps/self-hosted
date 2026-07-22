import * as path from 'path'
import * as request from 'supertest'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { createTestApp, destroyTestApp, waitForBackgroundJobs, TestApp } from '../../helpers/create-app'
import { UserService } from '../../../src/modules/user/user.service'
import { JobService } from '../../../src/modules/job/job.service'
import { GenerateWaveformJobService } from '../../../src/modules/job/jobs/generate-waveform.service'
import { WaveformService } from '../../../src/modules/waveform/waveform.service'
import { WAVEFORM_VERSION } from '../../../src/modules/waveform/analysis'
import { MusicTrack } from '../../../src/modules/music-track/music-track.entity'
import { MusicTrackWaveform } from '../../../src/modules/music-track/music-track-waveform.entity'
import { IndexingStates, RunType } from '../../../src/modules/indexing/enums'

const MUSIC_FIXTURES_DIR = path.resolve(__dirname, '../../fixtures/music')

let testApp: TestApp
let authToken: string
let waveformRepository: Repository<MusicTrackWaveform>
let waveformService: WaveformService
let tracks: MusicTrack[]

/**
 * Polls the indexing state endpoint until the service is idle.
 */
async function waitForIdleState(timeoutMs = 30000): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 250))

  const startTime = Date.now()
  while (Date.now() - startTime < timeoutMs) {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/index/state')
      .set('Authorization', `Bearer ${authToken}`)
    if (res.body && res.body.state === IndexingStates.IDLE) {
      return
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error(`Indexing service did not become idle within ${timeoutMs}ms`)
}

/**
 * Polls the waveform endpoint until it returns 200.
 */
async function waitForWaveform(musicTrackId: string, timeoutMs = 30000): Promise<request.Response> {
  const startTime = Date.now()
  while (Date.now() - startTime < timeoutMs) {
    const res = await request(testApp.app.getHttpServer())
      .get(`/api/v1/music/track/${musicTrackId}/waveform`)
      .set('Authorization', `Bearer ${authToken}`)
    if (res.status === 200) {
      return res
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`Waveform was not generated within ${timeoutMs}ms`)
}

beforeAll(async () => {
  // eslint-disable-next-line turbo/no-undeclared-env-vars
  process.env.MUSIC_DIR = MUSIC_FIXTURES_DIR

  testApp = await createTestApp()

  // Stop the job queue's interval so auto-created jobs never run and waveform
  // generation only happens through the code paths under test.
  testApp.moduleRef.get(JobService).onModuleDestroy()

  await request(testApp.app.getHttpServer())
    .post('/api/v1/setup')
    .send({ serverName: 'Waveforms Test Server', theme: 'dark', sendAnonymousUsageData: false })

  const userService = testApp.moduleRef.get(UserService)
  const guestAccount = await userService.getGuestAccount()

  const loginRes = await request(testApp.app.getHttpServer())
    .post('/api/v1/auth/login')
    .set('cardinal-app', 'admin')
    .send({ userId: guestAccount.userId })
    .expect(201)

  authToken = loginRes.body.JWT

  await request(testApp.app.getHttpServer())
    .post('/api/v1/index/run')
    .set('Authorization', `Bearer ${authToken}`)
    .send({ type: RunType.FULL, indexMusic: true, indexPhotos: false, indexMovies: false, indexTV: false })
  await waitForIdleState()

  const tracksRes = await request(testApp.app.getHttpServer())
    .get('/api/v1/music/tracks')
    .set('Authorization', `Bearer ${authToken}`)
    .expect(200)

  tracks = tracksRes.body[0]
  expect(tracks.length).toBeGreaterThan(0)

  waveformRepository = testApp.moduleRef.get(getRepositoryToken(MusicTrackWaveform))
  waveformService = testApp.moduleRef.get(WaveformService)

  // The indexing run auto-starts a generate_waveform job; let it finish and
  // clear its output so every test starts from a known state
  await waitForBackgroundJobs(testApp)
  await waveformRepository.createQueryBuilder().delete().execute()
}, 90000)

afterAll(async () => {
  // eslint-disable-next-line turbo/no-undeclared-env-vars
  delete process.env.MUSIC_DIR
  await waitForBackgroundJobs(testApp)
  await destroyTestApp(testApp)
}, 90000)

// -------------------------------------------------------------------------
// GET /api/v1/music/track/:id/waveform
// -------------------------------------------------------------------------

describe('GET /api/v1/music/track/:id/waveform', () => {
  it('returns 202 for a track without a waveform, then 200 once generated', async () => {
    const track = tracks[0]

    await request(testApp.app.getHttpServer())
      .get(`/api/v1/music/track/${track.musicTrackId}/waveform`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(202)

    const res = await waitForWaveform(track.musicTrackId)

    expect(res.body.version).toBe(WAVEFORM_VERSION)
    expect(res.body.binCount).toBeGreaterThan(100)
    expect(res.body.data.scales.peak).toBeGreaterThan(0)
    expect(res.body.data.scales.rms).toBeGreaterThan(0)
    expect(res.body.data.scales.bands).toBeGreaterThan(0)

    for (const channel of ['peak', 'rms', 'low', 'mid', 'high']) {
      const bytes = Buffer.from(res.body.data.channels[channel], 'base64')
      expect(bytes.length).toBe(res.body.binCount)
    }
  })

  it('returns 200 immediately when the waveform already exists', async () => {
    const track = tracks[0]

    const res = await request(testApp.app.getHttpServer())
      .get(`/api/v1/music/track/${track.musicTrackId}/waveform`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body.version).toBe(WAVEFORM_VERSION)
  })

  it('returns 404 for an unknown track', () => {
    return request(testApp.app.getHttpServer())
      .get('/api/v1/music/track/00000000-0000-0000-0000-000000000000/waveform')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404)
  })

  it('returns 401 without auth', () => {
    return request(testApp.app.getHttpServer())
      .get(`/api/v1/music/track/${tracks[0].musicTrackId}/waveform`)
      .expect(401)
  })
})

// -------------------------------------------------------------------------
// WaveformService deduplication
// -------------------------------------------------------------------------

describe('WaveformService', () => {
  it('shares one generation between concurrent calls for the same track', async () => {
    const track = tracks[0]
    await waveformRepository.delete({ track: { id: track.id } })

    const first = waveformService.generateForTrack(track.id)
    const second = waveformService.generateForTrack(track.id)

    expect(second).toBe(first)
    await first
  })
})

// -------------------------------------------------------------------------
// generate_waveform job work queries
// -------------------------------------------------------------------------

describe('GenerateWaveformJobService', () => {
  it('only counts tracks without a current waveform as work', async () => {
    const jobService = await testApp.moduleRef.resolve(GenerateWaveformJobService)

    for (const track of tracks) {
      await waveformService.generateForTrack(track.id)
    }
    expect(await jobService.countWork([])).toBe(0)
    expect(await jobService.getWork([], 100)).toEqual([])

    // Tracks with an outdated waveform version become work again
    await waveformRepository
      .createQueryBuilder()
      .update()
      .set({ version: 0 })
      .execute()
    expect(await jobService.countWork([])).toBe(tracks.length)

    const work = await jobService.getWork([], 100)
    expect(work).toHaveLength(tracks.length)

    // Excluded (previously failed) tracks are not offered as work
    expect(await jobService.countWork([work[0]])).toBe(tracks.length - 1)

    for (const track of tracks) {
      await waveformService.generateForTrack(track.id)
    }
    expect(await jobService.countWork([])).toBe(0)
  }, 120000)
})
