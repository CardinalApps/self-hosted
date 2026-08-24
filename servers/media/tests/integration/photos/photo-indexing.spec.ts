import * as path from 'path'
import * as request from 'supertest'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { createTestApp, destroyTestApp, waitForBackgroundJobs, TestApp } from '../../helpers/create-app'
import { UserService } from '../../../src/modules/user/user.service'
import { IndexingStates, RunStates, RunType } from '../../../src/modules/indexing/enums'
import { JobType, JobStatus } from '../../../src/modules/job/enums'
import { Photo } from '../../../src/modules/photo/photo.entity'
import { PhotoMetadata } from '../../../src/modules/photo/photo-metadata.entity'

const PHOTO_FIXTURES_DIR = path.resolve(__dirname, '../../fixtures/photos')

// The three files in tests/fixtures/photos. Only the GPS one carries Exif.
const NUM_PHOTO_FIXTURES = 3
const GPS_FIXTURE_NAME = '2024-03-10-gps.jpg'

/**
 * Polls the indexing state endpoint until the service is idle.
 */
async function waitForIdleState(app: ReturnType<TestApp['app']['getHttpServer']>, authToken: string, timeoutMs = 60000): Promise<void> {
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
let photoRepository: Repository<Photo>
let photoMetadataRepository: Repository<PhotoMetadata>

beforeAll(async () => {
  // eslint-disable-next-line turbo/no-undeclared-env-vars
  process.env.PHOTOS_DIR = PHOTO_FIXTURES_DIR

  testApp = await createTestApp()

  await request(testApp.app.getHttpServer())
    .post('/api/v1/setup')
    .send({ serverName: 'Photo Indexing Test Server', theme: 'dark', sendAnonymousUsageData: false })

  const userService = testApp.moduleRef.get(UserService)
  const guestAccount = await userService.getGuestAccount()

  const loginRes = await request(testApp.app.getHttpServer())
    .post('/api/v1/auth/login')
    .set('cardinal-app', 'admin')
    .send({ userId: guestAccount.userId })
    .expect(201)

  authToken = loginRes.body.JWT
  photoRepository = testApp.moduleRef.get(getRepositoryToken(Photo))
  photoMetadataRepository = testApp.moduleRef.get(getRepositoryToken(PhotoMetadata))

  const runRes = await request(testApp.app.getHttpServer())
    .post('/api/v1/index/run')
    .set('Authorization', `Bearer ${authToken}`)
    .send({ type: RunType.FULL, indexMusic: false, indexPhotos: true, indexMovies: false, indexTV: false })
    .expect(201)

  expect(runRes.body).toHaveProperty('runId')

  await waitForIdleState(testApp.app.getHttpServer(), authToken)

  // The variations and thumbnails jobs are auto-created once the run finishes,
  // so the job assertions below need them to have settled first.
  await waitForBackgroundJobs(testApp)
}, 120000)

afterAll(async () => {
  // eslint-disable-next-line turbo/no-undeclared-env-vars
  delete process.env.PHOTOS_DIR
  await waitForBackgroundJobs(testApp)
  await destroyTestApp(testApp)
}, 90000)

// -------------------------------------------------------------------------
// Photo entities
// -------------------------------------------------------------------------

describe('a full indexing run over the photo fixtures', () => {
  it('counts every photo file in the configured photos directory', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/index/counts')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body.photoFiles).toBe(NUM_PHOTO_FIXTURES)
  })

  it('creates one photo entity per indexed photo file', async () => {
    expect(await photoRepository.count()).toBe(NUM_PHOTO_FIXTURES)
  })

  it('gives every photo entity a UUID photo ID', async () => {
    const photos = await photoRepository.find()

    for (const photo of photos) {
      expect(photo.photoId).toMatch(/^[0-9a-f-]{36}$/)
    }
  })

  it('links every photo entity back to the file entity it was indexed from', async () => {
    const photos = await photoRepository.find({ relations: { file: true } })

    for (const photo of photos) {
      expect(photo.file).toBeTruthy()
      expect(photo.file.absolutePath.startsWith(PHOTO_FIXTURES_DIR)).toBe(true)
    }
  })

  it('resolves a takenAt time for every photo, even when the file carries no date', async () => {
    const photos = await photoRepository.find()

    for (const photo of photos) {
      expect(photo.takenAt).toBeTruthy()
      expect(isNaN(new Date(photo.takenAt).getTime())).toBe(false)
      expect(photo.takenOnDay).toBeTruthy()
      expect(Number(photo.timestamp)).toBe(new Date(photo.takenAt).getTime())
    }
  })

  it('dates a photo from a plain yyyy-mm-dd filename rather than from the file mtime', async () => {
    const photos = await photoRepository.find({ relations: { file: true } })

    // The fixtures on disk were written when the repo was checked out, so an
    // mtime fallback would date all of them to today.
    const expectations: [string, Date][] = [
      ['2024-01-01.jpg', new Date(2024, 0, 1)],
      ['2024-02-15.png', new Date(2024, 1, 15)],
    ]

    for (const [fileName, expected] of expectations) {
      const photo = photos.find((p) => p.file.absolutePath.endsWith(fileName))

      expect(photo.takenOnDay).toBe(expected.toDateString())
      expect(Number(photo.timestamp)).toBe(expected.getTime())
    }
  })

  it('reports the completed run in the runs list', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/index/runs')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    const completedRun = res.body[0].find((r: { status: RunStates }) => r.status === RunStates.COMPLETED)
    expect(completedRun).toBeDefined()
  })
})

// -------------------------------------------------------------------------
// Exif and GPS metadata
// -------------------------------------------------------------------------

describe('indexing a photo that carries Exif metadata', () => {
  let gpsPhoto: Photo

  beforeAll(async () => {
    const photos = await photoRepository.find({ relations: { file: true } })
    gpsPhoto = photos.find((photo) => photo.file.absolutePath.endsWith(GPS_FIXTURE_NAME))
  })

  it('stores one photo metadata row per Exif tag found in the file', async () => {
    const rows = await photoMetadataRepository.find({
      where: { photo: { id: gpsPhoto.id } },
    })

    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((row) => row.metadataFormat === 'exif')).toBe(true)
  })

  it('stores the raw Exif device tags as metadata rows', async () => {
    const rows = await photoMetadataRepository.find({
      where: { photo: { id: gpsPhoto.id } },
    })
    const byKey = Object.fromEntries(rows.map((row) => [row.metaKey, row.metaValue]))

    expect(byKey['Make']).toBe('Cardinal')
    expect(byKey['Model']).toBe('Test Camera')
  })

  it('stores the raw GPS Exif tags as metadata rows', async () => {
    const rows = await photoMetadataRepository.find({
      where: { photo: { id: gpsPhoto.id } },
    })
    const byKey = Object.fromEntries(rows.map((row) => [row.metaKey, row.metaValue]))

    expect(byKey['GPSLatitudeRef']).toBe('N')
    expect(byKey['GPSLongitudeRef']).toBe('E')
    expect(byKey['GPSDateStamp']).toBe('2024:03:10')
  })

  it('promotes the device make and model onto the photo entity', () => {
    expect(gpsPhoto.deviceMake).toBe('Cardinal')
    expect(gpsPhoto.deviceModel).toBe('Test Camera')
  })

  it('promotes the Exif pixel dimensions onto the photo entity', () => {
    expect(gpsPhoto.width).toBe(64)
    expect(gpsPhoto.height).toBe(48)
  })

  it('promotes the GPS coordinates onto the photo entity as numbers', () => {
    expect(gpsPhoto.gpsLat).toBeCloseTo(48.8582, 3)
    expect(gpsPhoto.gpsLng).toBeCloseTo(2.29127, 3)
    expect(gpsPhoto.gpsLatRef).toBe('N')
    expect(gpsPhoto.gpsLngRef).toBe('E')
    expect(gpsPhoto.gpsAltitude).toBe('35')
    expect(gpsPhoto.gpsDate).toBe('2024:03:10')
  })

  it('takes the photo date from the Exif original date rather than the file mtime', () => {
    const takenAt = new Date(gpsPhoto.takenAt)

    expect(takenAt.getUTCFullYear()).toBe(2024)
    expect(takenAt.getUTCMonth()).toBe(2)
  })

  it('prefers the Exif original date over the date in the filename', () => {
    // This fixture's name is also a yyyy-mm-dd date, which would put it at
    // local midnight. The Exif tag carries a time of day, so the two disagree.
    expect(Number(gpsPhoto.timestamp)).not.toBe(new Date(2024, 2, 10).getTime())
    expect(new Date(gpsPhoto.takenAt).getUTCFullYear()).toBe(2024)
  })

  it('leaves the Exif-derived columns null for photos with no Exif metadata', async () => {
    const photos = await photoRepository.find({ relations: { file: true } })
    const plainPhoto = photos.find((photo) => photo.file.absolutePath.endsWith('2024-02-15.png'))

    expect(plainPhoto.deviceMake).toBeNull()
    expect(plainPhoto.gpsLat).toBeNull()
  })
})

// -------------------------------------------------------------------------
// Jobs auto-started by the indexing run
// -------------------------------------------------------------------------

describe('the jobs that an indexing run with photos auto-starts', () => {
  let jobs: { type: JobType, status: JobStatus, totalTasks: number, completedAt: string }[]

  beforeAll(async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/jobs')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    jobs = res.body[0]
  })

  it('creates both a photo variations job and a photo thumbnails job', () => {
    const types = jobs.map((job) => job.type)

    expect(types).toContain(JobType.PHOTO_VARIATIONS)
    expect(types).toContain(JobType.PHOTO_THUMBNAILS)
  })

  it('runs the photo variations job to completion', () => {
    const job = jobs.find((j) => j.type === JobType.PHOTO_VARIATIONS)

    expect(job.status).toBe(JobStatus.COMPLETED)
    expect(job.completedAt).toBeTruthy()
  })

  it('finds no variation work to do when the library holds no HEIC photos', () => {
    const job = jobs.find((j) => j.type === JobType.PHOTO_VARIATIONS)

    expect(job.totalTasks).toBe(0)
  })

  /*
   * Every thumbnail task errors under ts-jest (see the worker-thread note
   * below), and jobs with unfinished tasks now report ERRORED instead of
   * masking the failures as COMPLETED. ERRORED is the truthful terminal
   * status for this harness; switch to COMPLETED when the harness runs
   * against compiled output.
   */
  it('runs the photo thumbnails job to a terminal status', () => {
    const job = jobs.find((j) => j.type === JobType.PHOTO_THUMBNAILS)

    expect(job.status).toBe(JobStatus.ERRORED)
    expect(job.completedAt).toBeTruthy()
  })

  it('queues one thumbnail task for every photo that has no thumbnails yet', () => {
    const job = jobs.find((j) => j.type === JobType.PHOTO_THUMBNAILS)

    expect(job.totalTasks).toBe(NUM_PHOTO_FIXTURES)
  })

  /*
   * Thumbnail files are produced by a worker thread that Node resolves from
   * __dirname at runtime. Under ts-jest that directory holds the uncompiled
   * create-thumbnail.ts, which a worker cannot load, so no thumbnail rows are
   * ever written here. The endpoint-level thumbnail coverage in photos.spec.ts
   * seeds its own rows instead. Re-enable this once the integration harness
   * runs against compiled output.
   */
  it.skip('writes a thumbnail row for every photo the job processed', async () => {
    const photos = await photoRepository.find({ relations: { thumbnail: true } })

    for (const photo of photos) {
      expect(photo.thumbnail.length).toBeGreaterThan(0)
    }
  })
})
