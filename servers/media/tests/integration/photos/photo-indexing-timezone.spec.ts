import * as path from 'path'
import { spawnSync } from 'child_process'
import * as request from 'supertest'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { createTestApp, destroyTestApp, waitForBackgroundJobs, TestApp } from '../../helpers/create-app'
import { UserService } from '../../../src/modules/user/user.service'
import { IndexingStates, RunType } from '../../../src/modules/indexing/enums'
import { Photo } from '../../../src/modules/photo/photo.entity'

const PHOTO_FIXTURES_DIR = path.resolve(__dirname, '../../fixtures/photos')

const GPS_FIXTURE_NAME = '2024-03-10-gps.jpg'

/*
 * Europe/Paris is UTC+1 on the fixture's date, so the Exif date leaves exifr as
 * a Date whose toString() carries a `+` in its offset. Most of the world's
 * servers sit at a positive offset; the Americas do not, which is why the
 * indexer's date handling reads as correct on the machines it was written on.
 */
const SERVER_TIMEZONE = 'Europe/Paris'

/*
 * V8 only re-reads the zone when TZ is set before the process starts. Assigning
 * process.env.TZ from inside a spec does nothing, because jest runs specs in a
 * vm realm that never sees the timezone change notification. So the spec runs
 * itself again in a child jest process that was launched with the zone already
 * set, and the child is the one that makes the assertions.
 */
const CHILD_MARKER = 'CARDINAL_TZ_SPEC_CHILD'
const isChild = process.env[CHILD_MARKER] === '1'

/*
 * The fixture's Exif DateTimeOriginal is the naive wall time 2024-03-10
 * 14:22:35. Exif carries no zone, so exifr reads it in the server's local zone,
 * which puts the photo at 13:22:35 UTC on a Paris server.
 */
const EXPECTED_TAKEN_AT = Date.parse('2024-03-10T13:22:35Z')

/**
 * Polls the indexing state endpoint until the service is idle.
 */
async function waitForIdleState(app: ReturnType<TestApp['app']['getHttpServer']>, authToken: string, timeoutMs = 60000): Promise<void> {
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

if (!isChild) {
  describe('the Exif date of a photo indexed at a positive UTC offset', () => {
    it('survives a full indexing run on a server in Europe/Paris', () => {
      const result = spawnSync(
        process.execPath,
        [
          require.resolve('jest/bin/jest'),
          '--config',
          path.resolve(__dirname, '../../jest.integration.json'),
          '--runInBand',
          '--testPathPattern',
          'photo-indexing-timezone',
        ],
        {
          cwd: path.resolve(__dirname, '../../../'),
          env: { ...process.env, TZ: SERVER_TIMEZONE, [CHILD_MARKER]: '1' },
          encoding: 'utf8',
        },
      )

      if (result.status !== 0) {
        console.error(result.stdout)
        console.error(result.stderr)
      }

      expect(result.status).toBe(0)
    }, 300000)
  })
} else {
  let testApp: TestApp
  let authToken: string
  let photoRepository: Repository<Photo>

  beforeAll(async () => {
    // eslint-disable-next-line turbo/no-undeclared-env-vars
    process.env.PHOTOS_DIR = PHOTO_FIXTURES_DIR

    testApp = await createTestApp()

    await request(testApp.app.getHttpServer())
      .post('/api/v1/setup')
      .send({ serverName: 'Photo Timezone Test Server', theme: 'dark', sendAnonymousUsageData: false })

    const userService = testApp.moduleRef.get(UserService)
    const guestAccount = await userService.getGuestAccount()

    const loginRes = await request(testApp.app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('cardinal-app', 'admin')
      .send({ userId: guestAccount.userId })
      .expect(201)

    authToken = loginRes.body.JWT
    photoRepository = testApp.moduleRef.get(getRepositoryToken(Photo))

    await request(testApp.app.getHttpServer())
      .post('/api/v1/index/run')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ type: RunType.FULL, indexMusic: false, indexPhotos: true, indexMovies: false, indexTV: false })
      .expect(201)

    await waitForIdleState(testApp.app.getHttpServer(), authToken)
    await waitForBackgroundJobs(testApp)
  }, 120000)

  afterAll(async () => {
    // eslint-disable-next-line turbo/no-undeclared-env-vars
    delete process.env.PHOTOS_DIR
    await waitForBackgroundJobs(testApp)
    await destroyTestApp(testApp)
  }, 90000)

  describe('indexing an Exif-dated photo on a server at a positive UTC offset', () => {
    let gpsPhoto: Photo

    beforeAll(async () => {
      const photos = await photoRepository.find({ relations: { file: true } })
      gpsPhoto = photos.find((photo) => photo.file.absolutePath.endsWith(GPS_FIXTURE_NAME))
    })

    it('runs in the timezone the spec forced', () => {
      expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(SERVER_TIMEZONE)
    })

    it('indexes the fixture that carries the Exif date', () => {
      expect(gpsPhoto).toBeTruthy()
    })

    it('keeps the local wall time that the Exif tag recorded', () => {
      const takenAt = new Date(gpsPhoto.takenAt)

      expect(takenAt.getFullYear()).toBe(2024)
      expect(takenAt.getMonth()).toBe(2)
      expect(takenAt.getDate()).toBe(10)
      expect(takenAt.getHours()).toBe(14)
      expect(takenAt.getMinutes()).toBe(22)
      expect(takenAt.getSeconds()).toBe(35)
    })

    it('stores the exact instant the Exif tag describes', () => {
      expect(Date.parse(gpsPhoto.takenAt)).toBe(EXPECTED_TAKEN_AT)
    })

    it('stores a timestamp column matching the Exif instant', () => {
      expect(Number(gpsPhoto.timestamp)).toBe(EXPECTED_TAKEN_AT)
    })

    it('does not fall back to the time the photo was indexed', () => {
      expect(Math.abs(Date.now() - Date.parse(gpsPhoto.takenAt))).toBeGreaterThan(60 * 60 * 1000)
    })
  })
}
