import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import * as request from 'supertest'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { v4 as uuid } from 'uuid'

import { createTestApp, destroyTestApp, waitForBackgroundJobs, TestApp } from '../../helpers/create-app'
import { UserService } from '../../../src/modules/user/user.service'
import { IndexingStates, RunType } from '../../../src/modules/indexing/enums'
import { File } from '../../../src/modules/indexing/entities/file.entity'
import { Photo } from '../../../src/modules/photo/photo.entity'
import { PhotoThumbnail } from '../../../src/modules/photo/photo-thumbnail.entity'
import { PhotoVariation } from '../../../src/modules/photo/photo-variation.entity'
import { JobTask } from '../../../src/modules/job/job-task.entity'
import { JobTaskStatus } from '../../../src/modules/job/enums'
import { PhotoThumbnailsJobService } from '../../../src/modules/job/jobs/photo-thumbnails.service'
import { ThumbnailService } from '../../../src/modules/thumbnail/thumbnail.service'
import { OutputCacheDirectories } from '../../../src/modules/thumbnail/enums'
import { getAppDir, touchAppDir } from '../../../src/utils/env'

const PHOTO_FIXTURES_DIR = path.resolve(__dirname, '../../fixtures/photos')
const NUM_PHOTO_FIXTURES = 3

// Seeded photos live outside PHOTO_FIXTURES_DIR so that the indexing run in
// beforeAll never picks them up and skews the fixture counts.
const SEED_DIR = path.join(os.tmpdir(), `cardinal-photo-seed-${process.pid}-${Date.now()}`)

// Anything but Safari 17, which is the one client the server trusts with HEIF.
const NON_HEIF_USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

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

/**
 * Reads a response body as raw bytes rather than letting superagent parse it.
 */
function readBlob(url: string, userAgent?: string) {
  const req = request(testApp.app.getHttpServer())
    .get(url)
    .set('Authorization', `Bearer ${authToken}`)

  if (userAgent) {
    req.set('User-Agent', userAgent)
  }

  return req
    .buffer(true)
    .parse((response, callback) => {
      const chunks = []
      response.on('data', (chunk) => chunks.push(chunk))
      response.on('end', () => callback(null, Buffer.concat(chunks)))
    })
}

/**
 * Writes a file into the seed directory and returns its absolute path.
 */
function writeSeedFile(name: string, bytes: Buffer): string {
  fs.mkdirSync(SEED_DIR, { recursive: true })
  const absolutePath = path.join(SEED_DIR, name)
  fs.writeFileSync(absolutePath, bytes)
  return absolutePath
}

/**
 * Plants a photo and its file row straight into the database. The indexer only
 * walks the photos directory, and the fixtures there hold no HEIC, so HEIC
 * sources and their variations have to be seeded by hand.
 */
async function seedPhoto(extension: string, bytes: Buffer): Promise<Photo> {
  const absolutePath = writeSeedFile(`source-${uuid()}.${extension}`, bytes)

  const file = await fileRepository.save({
    fileId: uuid(),
    absolutePath,
    relativePath: path.basename(absolutePath),
    extension,
    mimeType: `image/${extension}`,
    app: 'photos',
    mediaType: 'photos',
    size: bytes.length,
    lastSeen: new Date(),
  })

  return await photoRepository.save({
    photoId: uuid(),
    file,
    takenAt: new Date(),
    takenOnDay: '2024-05-01',
    timestamp: Date.now(),
  })
}

/**
 * Plants one variation of a seeded photo, with a real file behind it.
 */
async function seedVariation(photo: Photo, format: string, bytes: Buffer): Promise<PhotoVariation> {
  const absolutePath = writeSeedFile(`variation-${uuid()}.${format}`, bytes)

  return await photoVariationRepository.save({
    variationId: uuid(),
    absolutePath,
    relativeSrc: path.basename(absolutePath),
    format,
    bytes: bytes.length,
    photo,
  })
}

let testApp: TestApp
let authToken: string
let fileRepository: Repository<File>
let photoRepository: Repository<Photo>
let photoThumbnailRepository: Repository<PhotoThumbnail>
let photoVariationRepository: Repository<PhotoVariation>

// A photo that is known to have been indexed from the Exif-bearing fixture.
let gpsPhoto: Photo

beforeAll(async () => {
  // eslint-disable-next-line turbo/no-undeclared-env-vars
  process.env.PHOTOS_DIR = PHOTO_FIXTURES_DIR

  testApp = await createTestApp()

  await request(testApp.app.getHttpServer())
    .post('/api/v1/setup')
    .send({ serverName: 'Photos Test Server', theme: 'dark', sendAnonymousUsageData: false })

  const userService = testApp.moduleRef.get(UserService)
  const guestAccount = await userService.getGuestAccount()

  const loginRes = await request(testApp.app.getHttpServer())
    .post('/api/v1/auth/login')
    .set('cardinal-app', 'admin')
    .send({ userId: guestAccount.userId })
    .expect(201)

  authToken = loginRes.body.JWT
  fileRepository = testApp.moduleRef.get(getRepositoryToken(File))
  photoRepository = testApp.moduleRef.get(getRepositoryToken(Photo))
  photoThumbnailRepository = testApp.moduleRef.get(getRepositoryToken(PhotoThumbnail))
  photoVariationRepository = testApp.moduleRef.get(getRepositoryToken(PhotoVariation))

  await request(testApp.app.getHttpServer())
    .post('/api/v1/index/run')
    .set('Authorization', `Bearer ${authToken}`)
    .send({ type: RunType.FULL, indexMusic: false, indexPhotos: true, indexMovies: false, indexTV: false })
    .expect(201)

  await waitForIdleState(testApp.app.getHttpServer(), authToken)
  await waitForBackgroundJobs(testApp)

  const photos = await photoRepository.find({ relations: { file: true } })
  gpsPhoto = photos.find((photo) => photo.file.absolutePath.endsWith('2024-03-10-gps.jpg'))
}, 120000)

afterAll(async () => {
  // eslint-disable-next-line turbo/no-undeclared-env-vars
  delete process.env.PHOTOS_DIR
  await waitForBackgroundJobs(testApp)
  await destroyTestApp(testApp)
  fs.rmSync(SEED_DIR, { recursive: true, force: true })
}, 90000)

// -------------------------------------------------------------------------
// GET /api/v1/photos
// -------------------------------------------------------------------------

describe('GET /api/v1/photos', () => {
  it('returns a [photos, count] tuple covering every indexed photo', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/photos')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body).toHaveLength(2)
    expect(res.body[1]).toBe(NUM_PHOTO_FIXTURES)
    expect(res.body[0]).toHaveLength(NUM_PHOTO_FIXTURES)
  })

  it('omits the metadata, thumbnail and album relations unless they are asked for', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/photos')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body[0][0].metadata).toBeUndefined()
    expect(res.body[0][0].thumbnail).toBeUndefined()
    expect(res.body[0][0].photoAlbumEntries).toBeUndefined()
  })

  it('joins the Exif metadata rows when metadata=true', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/photos?metadata=true')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    const withMetadata = res.body[0].find((photo) => photo.photoId === gpsPhoto.photoId)
    expect(Array.isArray(withMetadata.metadata)).toBe(true)
    expect(withMetadata.metadata.length).toBeGreaterThan(0)
  })

  it('joins an empty thumbnail array when thumbnails=true and none exist yet', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/photos?thumbnails=true')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(Array.isArray(res.body[0][0].thumbnail)).toBe(true)
  })

  it('limits the page to the requested size and honours the offset', async () => {
    const firstPage = await request(testApp.app.getHttpServer())
      .get('/api/v1/photos?take=2&skip=0&orderBy=createdAt&order=ASC')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    const secondPage = await request(testApp.app.getHttpServer())
      .get('/api/v1/photos?take=2&skip=2&orderBy=createdAt&order=ASC')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(firstPage.body[0]).toHaveLength(2)
    expect(secondPage.body[0]).toHaveLength(1)
    expect(firstPage.body[1]).toBe(NUM_PHOTO_FIXTURES)

    const firstPageIds = firstPage.body[0].map((photo) => photo.photoId)
    expect(firstPageIds).not.toContain(secondPage.body[0][0].photoId)
  })

  it('orders by the requested column and direction', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/photos?orderBy=takenAt&order=ASC')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    const timestamps = res.body[0].map((photo) => new Date(photo.takenAt).getTime())
    const sorted = [...timestamps].sort((a, b) => a - b)
    expect(timestamps).toEqual(sorted)
  })

  it('rejects an ordering column that is not on the allow list', () => {
    return request(testApp.app.getHttpServer())
      .get('/api/v1/photos?orderBy=photoId')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(400)
  })

  it('accepts a lower case ordering direction', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/photos?orderBy=takenAt&order=asc')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    const timestamps = res.body[0].map((photo) => new Date(photo.takenAt).getTime())
    expect(timestamps).toEqual([...timestamps].sort((a, b) => a - b))
  })

  it('rejects an ordering direction that is neither ASC nor DESC', () => {
    return request(testApp.app.getHttpServer())
      .get('/api/v1/photos?order=sideways')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(400)
  })

  it('returns 401 without auth', () => {
    return request(testApp.app.getHttpServer())
      .get('/api/v1/photos')
      .expect(401)
  })

  // The three fixtures alone happen to be indexed newest-first, so they cannot
  // tell a real ordering apart from insertion order. These rows are seeded so
  // that the two disagree.
  describe('default ordering', () => {
    const seededTakenAt = ['2025-05-05T10:00:00.000Z', '2023-01-01T10:00:00.000Z', '2024-06-06T10:00:00.000Z']
    let seededIds: number[]

    beforeAll(async () => {
      seededIds = []

      for (const takenAt of seededTakenAt) {
        const saved = await photoRepository.save({ photoId: uuid(), takenAt: new Date(takenAt) })
        seededIds.push(saved.id)
      }
    })

    afterAll(async () => {
      await photoRepository.delete(seededIds)
    })

    it('falls back to newest-first by takenAt when no ordering params are sent', async () => {
      const res = await request(testApp.app.getHttpServer())
        .get('/api/v1/photos?take=100')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      const timestamps = res.body[0].map((photo) => new Date(photo.takenAt).getTime())
      expect(timestamps).toEqual([...timestamps].sort((a, b) => b - a))
    })

    it('applies that default to paginated slices too', async () => {
      const wholeLibrary = await request(testApp.app.getHttpServer())
        .get('/api/v1/photos?take=100')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      const pages = []
      for (let skip = 0; skip < wholeLibrary.body[1]; skip += 2) {
        const page = await request(testApp.app.getHttpServer())
          .get(`/api/v1/photos?take=2&skip=${skip}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)

        pages.push(...page.body[0])
      }

      expect(pages.map((photo) => photo.photoId)).toEqual(wholeLibrary.body[0].map((photo) => photo.photoId))
    })

    it('returns the same default order on repeated calls', async () => {
      const first = await request(testApp.app.getHttpServer())
        .get('/api/v1/photos?take=100')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      const second = await request(testApp.app.getHttpServer())
        .get('/api/v1/photos?take=100')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(second.body[0].map((photo) => photo.photoId)).toEqual(first.body[0].map((photo) => photo.photoId))
    })
  })
})

// -------------------------------------------------------------------------
// GET /api/v1/photos/count
// -------------------------------------------------------------------------

describe('GET /api/v1/photos/count', () => {
  it('returns the number of photo entities in the database', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/photos/count')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(Number(res.text)).toBe(NUM_PHOTO_FIXTURES)
  })

  it('returns 401 without auth', () => {
    return request(testApp.app.getHttpServer())
      .get('/api/v1/photos/count')
      .expect(401)
  })
})

// -------------------------------------------------------------------------
// GET /api/v1/photo/:id
//
// Every /photo/:id route accepts either identifier: an all-digits param is the
// numeric row ID, anything else is the UUID photo ID. Neither form matching a
// row is a 404.
// -------------------------------------------------------------------------

describe('GET /api/v1/photo/:id', () => {
  it('returns the photo addressed by its row ID', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get(`/api/v1/photo/${gpsPhoto.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body.photoId).toBe(gpsPhoto.photoId)
    expect(res.body.deviceMake).toBe('Cardinal')
  })

  it('joins the file entity when file=true', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get(`/api/v1/photo/${gpsPhoto.id}?file=true`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body.file).toBeTruthy()
    expect(res.body.file.absolutePath).toContain('2024-03-10-gps.jpg')
  })

  it('joins the Exif metadata rows when metadata=true', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get(`/api/v1/photo/${gpsPhoto.id}?metadata=true`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    const makeRow = res.body.metadata.find((row) => row.metaKey === 'Make')
    expect(makeRow.metaValue).toBe('Cardinal')
  })

  it('joins the album entries when photoAlbumEntries=true', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get(`/api/v1/photo/${gpsPhoto.id}?photoAlbumEntries=true`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(Array.isArray(res.body.photoAlbumEntries)).toBe(true)
  })

  it('returns 404 for a row ID that does not exist', () => {
    return request(testApp.app.getHttpServer())
      .get('/api/v1/photo/999999')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404)
  })

  it('returns 401 without auth', () => {
    return request(testApp.app.getHttpServer())
      .get(`/api/v1/photo/${gpsPhoto.id}`)
      .expect(401)
  })

  it('returns the photo addressed by its UUID photo ID', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get(`/api/v1/photo/${gpsPhoto.photoId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body.photoId).toBe(gpsPhoto.photoId)
  })

  it('joins the requested relations when addressed by its UUID photo ID', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get(`/api/v1/photo/${gpsPhoto.photoId}?file=true&metadata=true&photoAlbumEntries=true`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body.file.absolutePath).toContain('2024-03-10-gps.jpg')
    expect(res.body.metadata.length).toBeGreaterThan(0)
    expect(Array.isArray(res.body.photoAlbumEntries)).toBe(true)
  })

  it('returns 404 rather than 500 for a UUID that matches no photo', () => {
    return request(testApp.app.getHttpServer())
      .get(`/api/v1/photo/${uuid()}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404)
  })

  it('returns 404 rather than 500 for a param that is neither a row ID nor a UUID', () => {
    return request(testApp.app.getHttpServer())
      .get('/api/v1/photo/not-an-identifier')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404)
  })

  // An all-digits param that overflows the 32-bit row ID column would make
  // Postgres throw rather than return no rows.
  it('returns 404 rather than 500 for a numeric param too large to be a row ID', () => {
    return request(testApp.app.getHttpServer())
      .get('/api/v1/photo/99999999999999999999')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404)
  })
})

// -------------------------------------------------------------------------
// GET /api/v1/photo/:id/blob
// -------------------------------------------------------------------------

describe('GET /api/v1/photo/:id/blob', () => {
  it('streams back the bytes of the original photo file', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get(`/api/v1/photo/${gpsPhoto.id}/blob`)
      .set('Authorization', `Bearer ${authToken}`)
      .buffer(true)
      .parse((response, callback) => {
        const chunks = []
        response.on('data', (chunk) => chunks.push(chunk))
        response.on('end', () => callback(null, Buffer.concat(chunks)))
      })
      .expect(200)

    const onDisk = fs.readFileSync(path.join(PHOTO_FIXTURES_DIR, '2024-03-10-gps.jpg'))
    expect(res.body.equals(onDisk)).toBe(true)
  })

  it('serves the original file untouched when the format needs no conversion', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get(`/api/v1/photo/${gpsPhoto.id}/blob?autoConvert=true`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    // Only HEIF sources are converted, so no transformation headers are set.
    expect(res.headers['cardinal-converted-photo-from']).toBeUndefined()
  })

  it('returns 404 for a row ID that does not exist', () => {
    return request(testApp.app.getHttpServer())
      .get('/api/v1/photo/999999/blob')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404)
  })

  it('returns 401 without auth', () => {
    return request(testApp.app.getHttpServer())
      .get(`/api/v1/photo/${gpsPhoto.id}/blob`)
      .expect(401)
  })

  it('streams the photo addressed by its UUID photo ID', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get(`/api/v1/photo/${gpsPhoto.photoId}/blob`)
      .set('Authorization', `Bearer ${authToken}`)
      .buffer(true)
      .parse((response, callback) => {
        const chunks = []
        response.on('data', (chunk) => chunks.push(chunk))
        response.on('end', () => callback(null, Buffer.concat(chunks)))
      })
      .expect(200)

    const onDisk = fs.readFileSync(path.join(PHOTO_FIXTURES_DIR, '2024-03-10-gps.jpg'))
    expect(res.body.equals(onDisk)).toBe(true)
  })

  it('returns 404 rather than 500 for a UUID that matches no photo', () => {
    return request(testApp.app.getHttpServer())
      .get(`/api/v1/photo/${uuid()}/blob`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404)
  })
})

// -------------------------------------------------------------------------
// GET /api/v1/photo/:id/blob for a HEIC source
//
// A client that cannot render HEIF is served the photo's JPEG variation when
// one exists, and an on-the-fly conversion of the source when one doesn't.
// The conversion runs in a worker thread that Node resolves from __dirname,
// which under ts-jest holds the uncompiled heic-to-jpg.ts, so it always
// resolves to nothing here — these specs therefore either supply a JPEG
// variation or assert only that the request survives the failed conversion.
// -------------------------------------------------------------------------

describe('GET /api/v1/photo/:id/blob for a HEIC source', () => {
  const heicBytes = Buffer.from('heic-source-bytes')
  const jpegVariationBytes = Buffer.from('jpeg-variation-bytes')
  const pngVariationBytes = Buffer.from('png-variation-bytes')

  let withJpegVariation: Photo
  let withOnlyPngVariation: Photo

  beforeAll(async () => {
    withJpegVariation = await seedPhoto('heic', heicBytes)
    await seedVariation(withJpegVariation, 'jpeg', jpegVariationBytes)

    withOnlyPngVariation = await seedPhoto('heic', heicBytes)
    await seedVariation(withOnlyPngVariation, 'png', pngVariationBytes)
  })

  it('converts by default, when the request carries no autoConvert param', async () => {
    const res = await readBlob(`/api/v1/photo/${withJpegVariation.id}/blob`, NON_HEIF_USER_AGENT)
      .expect(200)

    expect(res.body.equals(jpegVariationBytes)).toBe(true)
    expect(res.headers['cardinal-converted-photo-from']).toBe('heic')
    expect(res.headers['cardinal-converted-photo-to']).toBe('jpeg')
  })

  it('serves the JPEG variation when autoConvert is explicitly true', async () => {
    const res = await readBlob(`/api/v1/photo/${withJpegVariation.id}/blob?autoConvert=true`, NON_HEIF_USER_AGENT)
      .expect(200)

    expect(res.body.equals(jpegVariationBytes)).toBe(true)
    expect(res.headers['cardinal-converted-photo-from']).toBe('heic')
  })

  it('serves the untouched source when autoConvert is explicitly false', async () => {
    const res = await readBlob(`/api/v1/photo/${withJpegVariation.id}/blob?autoConvert=false`, NON_HEIF_USER_AGENT)
      .expect(200)

    expect(res.body.equals(heicBytes)).toBe(true)
    expect(res.headers['cardinal-converted-photo-from']).toBeUndefined()
  })

  it('does not fail when the photo has variations but none of them is a JPEG', async () => {
    const res = await readBlob(`/api/v1/photo/${withOnlyPngVariation.id}/blob?autoConvert=true`, NON_HEIF_USER_AGENT)
      .expect(200)

    expect(res.body.length).toBeGreaterThan(0)
    expect(res.body.equals(pngVariationBytes)).toBe(false)
  })

  it('does not fail when the photo has no variations at all', async () => {
    const withoutVariations = await seedPhoto('heic', heicBytes)

    const res = await readBlob(`/api/v1/photo/${withoutVariations.id}/blob?autoConvert=true`, NON_HEIF_USER_AGENT)
      .expect(200)

    expect(res.body.length).toBeGreaterThan(0)
  })

  // A repeated query param arrives as an array of strings rather than a
  // string, which the autoConvert transform has to survive.
  it('does not fail when autoConvert is given more than once', async () => {
    const res = await readBlob(`/api/v1/photo/${withJpegVariation.id}/blob?autoConvert=true&autoConvert=false`, NON_HEIF_USER_AGENT)
      .expect(200)

    expect(res.body.equals(heicBytes)).toBe(true)
    expect(res.headers['cardinal-converted-photo-from']).toBeUndefined()
  })

  it('does not claim a conversion happened when none did', async () => {
    const res = await readBlob(`/api/v1/photo/${withOnlyPngVariation.id}/blob?autoConvert=true`, NON_HEIF_USER_AGENT)
      .expect(200)

    expect(res.headers['cardinal-converted-photo-from']).toBeUndefined()
  })
})

// -------------------------------------------------------------------------
// GET /api/v1/photo/:id/thumbnail
//
// The thumbnails job cannot produce files under ts-jest (its worker thread
// resolves an uncompiled .ts file), so this block seeds a thumbnail row and a
// matching file to exercise the endpoint itself.
// -------------------------------------------------------------------------

describe('GET /api/v1/photo/:id/thumbnail', () => {
  const thumbnailFileName = `integration-test-${uuid()}__small_nocrop.jpeg`
  const relativeSrc = path.join(OutputCacheDirectories.PHOTO_THUMBNAILS, thumbnailFileName)
  let thumbnailBytes: Buffer

  beforeAll(async () => {
    touchAppDir([OutputCacheDirectories.PHOTO_THUMBNAILS])
    thumbnailBytes = fs.readFileSync(path.join(PHOTO_FIXTURES_DIR, '2024-01-01.jpg'))
    fs.writeFileSync(getAppDir(relativeSrc), thumbnailBytes)

    await photoThumbnailRepository.save({
      thumbnailId: uuid(),
      absolutePath: getAppDir(relativeSrc),
      relativeSrc,
      size: 'small_nocrop',
      format: 'jpeg',
      width: 64,
      height: 48,
      bytes: thumbnailBytes.length,
      photo: gpsPhoto,
    })
  })

  afterAll(() => {
    fs.rmSync(getAppDir(relativeSrc), { force: true })
  })

  it('streams back the thumbnail file for the default size', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get(`/api/v1/photo/${gpsPhoto.photoId}/thumbnail`)
      .set('Authorization', `Bearer ${authToken}`)
      .buffer(true)
      .parse((response, callback) => {
        const chunks = []
        response.on('data', (chunk) => chunks.push(chunk))
        response.on('end', () => callback(null, Buffer.concat(chunks)))
      })
      .expect(200)

    expect(res.body.equals(thumbnailBytes)).toBe(true)
  })

  it('streams back the thumbnail file for an explicitly requested size', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get(`/api/v1/photo/${gpsPhoto.photoId}/thumbnail?size=small_nocrop`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.status).toBe(200)
  })

  it('returns 404 when the photo has no thumbnail of the requested size', () => {
    return request(testApp.app.getHttpServer())
      .get(`/api/v1/photo/${gpsPhoto.photoId}/thumbnail?size=medium_nocrop`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404)
  })

  it('streams back the thumbnail file when the photo is addressed by its row ID', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get(`/api/v1/photo/${gpsPhoto.id}/thumbnail`)
      .set('Authorization', `Bearer ${authToken}`)
      .buffer(true)
      .parse((response, callback) => {
        const chunks = []
        response.on('data', (chunk) => chunks.push(chunk))
        response.on('end', () => callback(null, Buffer.concat(chunks)))
      })
      .expect(200)

    expect(res.body.equals(thumbnailBytes)).toBe(true)
  })

  it('returns 404 for a photo ID that does not exist', () => {
    return request(testApp.app.getHttpServer())
      .get(`/api/v1/photo/${uuid()}/thumbnail`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404)
  })

  it('returns 404 for a row ID that does not exist', () => {
    return request(testApp.app.getHttpServer())
      .get('/api/v1/photo/999999/thumbnail')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404)
  })

  it('returns 401 without auth', () => {
    return request(testApp.app.getHttpServer())
      .get(`/api/v1/photo/${gpsPhoto.photoId}/thumbnail`)
      .expect(401)
  })
})

// -------------------------------------------------------------------------
// PATCH /api/v1/photo/:id
// -------------------------------------------------------------------------

describe('PATCH /api/v1/photo/:id', () => {
  let albumOneId: number
  let albumTwoId: number

  beforeAll(async () => {
    const one = await request(testApp.app.getHttpServer())
      .post('/api/v1/photo-album')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Patch Target One' })
      .expect(201)

    const two = await request(testApp.app.getHttpServer())
      .post('/api/v1/photo-album')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Patch Target Two' })
      .expect(201)

    albumOneId = one.body.id
    albumTwoId = two.body.id
  })

  it('adds the photo to every album in the request body', async () => {
    await request(testApp.app.getHttpServer())
      .patch(`/api/v1/photo/${gpsPhoto.photoId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ photoAlbums: [albumOneId, albumTwoId] })
      .expect(200)

    const res = await request(testApp.app.getHttpServer())
      .get(`/api/v1/photo/${gpsPhoto.id}?photoAlbumEntries=true`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body.photoAlbumEntries).toHaveLength(2)
  })

  it('does not create a duplicate entry when the photo is already in the album', async () => {
    await request(testApp.app.getHttpServer())
      .patch(`/api/v1/photo/${gpsPhoto.photoId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ photoAlbums: [albumOneId, albumTwoId] })
      .expect(200)

    const res = await request(testApp.app.getHttpServer())
      .get(`/api/v1/photo/${gpsPhoto.id}?photoAlbumEntries=true`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body.photoAlbumEntries).toHaveLength(2)
  })

  it('removes the photo from albums that are left out of the request body', async () => {
    await request(testApp.app.getHttpServer())
      .patch(`/api/v1/photo/${gpsPhoto.photoId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ photoAlbums: [albumOneId] })
      .expect(200)

    const res = await request(testApp.app.getHttpServer())
      .get(`/api/v1/photo/${gpsPhoto.id}?photoAlbumEntries=true`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body.photoAlbumEntries).toHaveLength(1)
  })

  it('marks the first photo added to an album as that album\'s featured photo', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get(`/api/v1/photo-album/${albumOneId}/entries?featured=true`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body[1]).toBe(1)
  })

  it('accepts the numeric row ID in place of the UUID photo ID', async () => {
    await request(testApp.app.getHttpServer())
      .patch(`/api/v1/photo/${gpsPhoto.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ photoAlbums: [albumOneId, albumTwoId] })
      .expect(200)

    const res = await request(testApp.app.getHttpServer())
      .get(`/api/v1/photo/${gpsPhoto.id}?photoAlbumEntries=true`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body.photoAlbumEntries).toHaveLength(2)
  })

  it('returns 404 for a row ID that does not exist', () => {
    return request(testApp.app.getHttpServer())
      .patch('/api/v1/photo/999999')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ photoAlbums: [albumOneId] })
      .expect(404)
  })

  it('returns 404 for a photo ID that does not exist', () => {
    return request(testApp.app.getHttpServer())
      .patch(`/api/v1/photo/${uuid()}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ photoAlbums: [albumOneId] })
      .expect(404)
  })

  it('returns 400 when the photoAlbums array is missing', () => {
    return request(testApp.app.getHttpServer())
      .patch(`/api/v1/photo/${gpsPhoto.photoId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({})
      .expect(400)
  })

  it('returns 401 without auth', () => {
    return request(testApp.app.getHttpServer())
      .patch(`/api/v1/photo/${gpsPhoto.photoId}`)
      .send({ photoAlbums: [] })
      .expect(401)
  })
})

// -------------------------------------------------------------------------
// The photo thumbnails job
//
// Thumbnailing a HEIC source means decoding it twice, so the job prefers the
// JPEG variation the variations job already produced. The thumbnail files
// themselves cannot be produced under ts-jest (the worker thread resolves an
// uncompiled .ts file), so these specs stub the thumbnail service and assert
// on the source file the job hands it.
// -------------------------------------------------------------------------

describe('the source file that the photo thumbnails job works from', () => {
  const heicBytes = Buffer.from('heic-source-bytes')
  const jpegBytes = Buffer.from('jpeg-bytes')
  const pngBytes = Buffer.from('png-bytes')

  let jobService: PhotoThumbnailsJobService
  let jobTaskRepository: Repository<JobTask>
  let createThumbnails: jest.SpyInstance

  /**
   * Runs one thumbnail task against a photo and returns the source file path
   * the job asked the thumbnail service to work from.
   */
  async function sourceFileFor(photo: Photo): Promise<string> {
    const task = await jobTaskRepository.save({
      jobTaskId: uuid(),
      target: String(photo.id),
      status: JobTaskStatus.IN_QUEUE,
    })

    createThumbnails.mockClear()
    await jobService.executeTask(task as JobTask)

    return createThumbnails.mock.calls[0][0].absoluteFilePath
  }

  beforeAll(async () => {
    jobService = await testApp.moduleRef.resolve(PhotoThumbnailsJobService, undefined, { strict: false })
    jobTaskRepository = testApp.moduleRef.get(getRepositoryToken(JobTask))
    createThumbnails = jest
      .spyOn(testApp.moduleRef.get(ThumbnailService), 'createThumbnails')
      .mockResolvedValue({ status: 'success', executionDuration: 0, files: {} })
  })

  afterAll(() => {
    createThumbnails.mockRestore()
  })

  it('works from the JPEG variation, not from whichever variation comes first', async () => {
    const photo = await seedPhoto('heic', heicBytes)
    await seedVariation(photo, 'png', pngBytes)
    const jpegVariation = await seedVariation(photo, 'jpeg', jpegBytes)

    expect(await sourceFileFor(photo)).toBe(jpegVariation.absolutePath)
  })

  it('recognises a jpg variation as a JPEG one', async () => {
    const photo = await seedPhoto('heic', heicBytes)
    const jpgVariation = await seedVariation(photo, 'jpg', jpegBytes)

    expect(await sourceFileFor(photo)).toBe(jpgVariation.absolutePath)
  })

  it('works from the source file when the photo has no variations', async () => {
    const photo = await seedPhoto('jpeg', jpegBytes)

    expect(await sourceFileFor(photo)).toBe(photo.file.absolutePath)
  })

  it('works from the source file when none of the variations is a JPEG', async () => {
    const photo = await seedPhoto('heic', heicBytes)
    await seedVariation(photo, 'png', pngBytes)

    expect(await sourceFileFor(photo)).toBe(photo.file.absolutePath)
  })
})
