import * as path from 'path'
import * as request from 'supertest'

import { createTestApp, destroyTestApp, TestApp } from '../../helpers/create-app'
import { UserService } from '../../../src/modules/user/user.service'
import { IndexingStates, RunStates, RunType } from '../../../src/modules/indexing/enums'
import { MusicArtist } from '../../../src/modules/music-artist/music-artist.entity'
import { MusicRelease } from '../../../src/modules/music-release/music-release.entity'
import { MusicTrack } from '../../../src/modules/music-track/music-track.entity'

const MUSIC_FIXTURES_DIR = path.resolve(__dirname, '../../fixtures/music')

/**
 * Polls the indexing state endpoint until the service is idle.
 */
async function waitForIdleState(app: ReturnType<TestApp['app']['getHttpServer']>, authToken: string, timeoutMs = 30000): Promise<void> {
  // Add a brief delay before polling to prevent a race condition where we
  // check the state before a background job has had a chance to start.
  await new Promise((resolve) => setTimeout(resolve, 250))

  const startTime = Date.now()
  while (Date.now() - startTime < timeoutMs) {
    const res = await request(app).get('/api/v1/index/state').set('Authorization', `Bearer ${authToken}`)
    if (res.body && res.body.state === IndexingStates.IDLE) {
      return
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error(`Indexing service did not become idle within ${timeoutMs}ms`)
}

let testApp: TestApp
let authToken: string

beforeAll(async () => {
  // eslint-disable-next-line turbo/no-undeclared-env-vars
  process.env.MUSIC_DIR = MUSIC_FIXTURES_DIR

  testApp = await createTestApp()

  await request(testApp.app.getHttpServer())
    .post('/api/v1/setup')
    .send({ serverName: 'Indexing Test Server', theme: 'dark', sendAnonymousUsageData: false })

  const userService = testApp.moduleRef.get(UserService)
  const guestAccount = await userService.getGuestAccount()

  const loginRes = await request(testApp.app.getHttpServer())
    .post('/api/v1/auth/login')
    .set('cardinal-app', 'admin')
    .send({ userId: guestAccount.userId })
    .expect(201)

  authToken = loginRes.body.JWT
}, 90000)

afterAll(async () => {
  // eslint-disable-next-line turbo/no-undeclared-env-vars
  delete process.env.MUSIC_DIR
  await destroyTestApp(testApp)
})

// -------------------------------------------------------------------------
// GET /api/v1/index/state
// -------------------------------------------------------------------------

describe('GET /api/v1/index/state', () => {
  it('returns 200 with the current indexing state', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/index/state')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body).toHaveProperty('state')
    expect(Object.values(IndexingStates)).toContain(res.body.state)
  })

  it('returns 403 without auth', () => {
    return request(testApp.app.getHttpServer())
      .get('/api/v1/index/state')
      .expect(401)
  })
})

// -------------------------------------------------------------------------
// GET /api/v1/index/directories
// -------------------------------------------------------------------------

describe('GET /api/v1/index/directories', () => {
  it('returns 200 with the configured media directories', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/index/directories')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body).toHaveProperty('music')
    expect(res.body.music).toBe(MUSIC_FIXTURES_DIR)
  })

  it('returns 403 without auth', () => {
    return request(testApp.app.getHttpServer())
      .get('/api/v1/index/directories')
      .expect(401)
  })
})

// -------------------------------------------------------------------------
// GET /api/v1/index/counts
// -------------------------------------------------------------------------

describe('GET /api/v1/index/counts', () => {
  it('returns 200 with file counts', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/index/counts')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body).toHaveProperty('musicFiles')
    expect(res.body).toHaveProperty('photoFiles')
    expect(typeof res.body.musicFiles).toBe('number')
  })

  it('returns 403 without auth', () => {
    return request(testApp.app.getHttpServer())
      .get('/api/v1/index/counts')
      .expect(401)
  })
})

// -------------------------------------------------------------------------
// GET /api/v1/index/runs
// -------------------------------------------------------------------------

describe('GET /api/v1/index/runs', () => {
  it('returns 200 with a [runs, count] tuple', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/index/runs')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body).toHaveLength(2)
    expect(Array.isArray(res.body[0])).toBe(true)
    expect(typeof res.body[1]).toBe('number')
  })

  it('returns 403 without auth', () => {
    return request(testApp.app.getHttpServer())
      .get('/api/v1/index/runs')
      .expect(401)
  })
})

// -------------------------------------------------------------------------
// POST /api/v1/index/run + music indexing integration
//
// One indexing run is started here and awaited. The shape of the response is
// verified, then subsequent tests assert on the indexed entities.
// -------------------------------------------------------------------------

describe('POST /api/v1/index/run', () => {
  it('returns 403 without auth', () => {
    return request(testApp.app.getHttpServer())
      .post('/api/v1/index/run')
      .send({ type: RunType.FULL, indexMusic: true, indexPhotos: false, indexMovies: false, indexTV: false })
      .expect(401)
  })
})

describe('music indexing', () => {
  beforeAll(async () => {
    const res = await request(testApp.app.getHttpServer())
      .post('/api/v1/index/run')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ type: RunType.FULL, indexMusic: true, indexPhotos: false, indexMovies: false, indexTV: false })

    expect(res.body).toHaveProperty('runId')

    await waitForIdleState(testApp.app.getHttpServer(), authToken)
  }, 30000)

  it('indexes all 3 music fixture files', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/index/counts')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body.musicFiles).toBe(3)
  })

  it('uses embedded artist name when available, folder structure otherwise', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/music/artists')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body[1]).toBe(2)

    const names = res.body[0].map((a: MusicArtist) => a.name)
    expect(names).toContain('Animals as Leaders (Embedded)')
    expect(names).toContain('Mock Artist Name')
  })

  it('uses embedded release name when available, folder structure otherwise', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/music/releases')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body[1]).toBe(2)

    const titles = res.body[0].map((r: MusicRelease) => r.title)
    expect(titles).toContain('Parrhesia (Embedded)')
    expect(titles).toContain('Mock Release Name')
  })

  it('creates 3 tracks in total', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/music/tracks')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body[1]).toBe(3)
  })

  it('uses embedded track number when available', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/music/tracks')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    const track = res.body[0].find((t: MusicTrack) => t.title === 'Do Not Go Gently (Embedded)')
    expect(track.trackNumber).toBe(2)
  })

  it('falls back to folder structure for disc number when no embedded metadata', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/music/tracks')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    const track = res.body[0].find((t: MusicTrack) => t.title === 'ai-generated-track-without-embedded-metdata')
    expect(track.discNumber).toBe(1)
  })

  it('the completed run appears in the runs list', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/index/runs')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    const completedRun = res.body[0].find((r: { status: RunStates }) => r.status === RunStates.COMPLETED)
    expect(completedRun).toBeDefined()
  })
})

// -------------------------------------------------------------------------
// GET /api/v1/index/file
// -------------------------------------------------------------------------

describe('GET /api/v1/index/file', () => {
  it('returns 200 with indexed files', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/index/file')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(Array.isArray(res.body)).toBe(true)
  })

  it('returns 403 without auth', () => {
    return request(testApp.app.getHttpServer())
      .get('/api/v1/index/file')
      .expect(401)
  })
})

// -------------------------------------------------------------------------
// DELETE /api/v1/index/files
// -------------------------------------------------------------------------

describe('DELETE /api/v1/index/files', () => {
  it('deindexes a file by ID', async () => {
    const filesRes = await request(testApp.app.getHttpServer())
      .get('/api/v1/index/file')
      .set('Authorization', `Bearer ${authToken}`)

    const fileId = filesRes.body[0]?.fileId
    if (!fileId) return

    const res = await request(testApp.app.getHttpServer())
      .delete(`/api/v1/index/files?ids=${fileId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body[fileId]).toBe(true)

    // Wait for the indexer to finish background cleanup before proceeding to prevent db connection leaks
    await waitForIdleState(testApp.app.getHttpServer(), authToken)
  })

  it('returns 403 without auth', () => {
    return request(testApp.app.getHttpServer())
      .delete('/api/v1/index/files?ids=some-id')
      .expect(401)
  })
})

// -------------------------------------------------------------------------
// PATCH /api/v1/index/state
// -------------------------------------------------------------------------

describe('PATCH /api/v1/index/state', () => {
  it('returns 409 when trying to pause while idle', () => {
    return request(testApp.app.getHttpServer())
      .patch('/api/v1/index/state')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ action: 'pause' })
      .expect(409)
  })

  it('returns 403 without auth', () => {
    return request(testApp.app.getHttpServer())
      .patch('/api/v1/index/state')
      .send({ action: 'pause' })
      .expect(401)
  })
})
