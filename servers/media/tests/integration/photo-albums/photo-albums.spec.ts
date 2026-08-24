import * as path from 'path'
import * as request from 'supertest'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { createTestApp, destroyTestApp, waitForBackgroundJobs, TestApp } from '../../helpers/create-app'
import { UserService } from '../../../src/modules/user/user.service'
import { IndexingStates, RunType } from '../../../src/modules/indexing/enums'
import { Photo } from '../../../src/modules/photo/photo.entity'
import { PhotoAlbum } from '../../../src/modules/photo-album/photo-album.entity'
import { PhotoAlbumEntry } from '../../../src/modules/photo-album/photo-album-entry.entity'
import { PhotoAlbumEntryService } from '../../../src/modules/photo-album/photo-album-entry.service'

const PHOTO_FIXTURES_DIR = path.resolve(__dirname, '../../fixtures/photos')

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

let testApp: TestApp
let authToken: string
let photos: Photo[]

/**
 * Creates a photo album through the API and returns it.
 */
async function createAlbum(name: string): Promise<{ id: number, photoAlbumId: string, name: string }> {
  const res = await request(testApp.app.getHttpServer())
    .post('/api/v1/photo-album')
    .set('Authorization', `Bearer ${authToken}`)
    .send({ name })
    .expect(201)

  return res.body
}

/**
 * Puts a photo into an album by way of the photo update endpoint, which is the
 * only route that writes album entries.
 */
async function addPhotoToAlbums(photo: Photo, albumIds: number[]): Promise<void> {
  await request(testApp.app.getHttpServer())
    .patch(`/api/v1/photo/${photo.photoId}`)
    .set('Authorization', `Bearer ${authToken}`)
    .send({ photoAlbums: albumIds })
    .expect(200)
}

beforeAll(async () => {
  // eslint-disable-next-line turbo/no-undeclared-env-vars
  process.env.PHOTOS_DIR = PHOTO_FIXTURES_DIR

  testApp = await createTestApp()

  await request(testApp.app.getHttpServer())
    .post('/api/v1/setup')
    .send({ serverName: 'Photo Albums Test Server', theme: 'dark', sendAnonymousUsageData: false })

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
    .send({ type: RunType.FULL, indexMusic: false, indexPhotos: true, indexMovies: false, indexTV: false })
    .expect(201)

  await waitForIdleState(testApp.app.getHttpServer(), authToken)
  await waitForBackgroundJobs(testApp)

  const photoRepository: Repository<Photo> = testApp.moduleRef.get(getRepositoryToken(Photo))
  photos = await photoRepository.find({ order: { id: 'ASC' } })
}, 120000)

afterAll(async () => {
  // eslint-disable-next-line turbo/no-undeclared-env-vars
  delete process.env.PHOTOS_DIR
  await waitForBackgroundJobs(testApp)
  await destroyTestApp(testApp)
}, 90000)

// -------------------------------------------------------------------------
// POST /api/v1/photo-album
// -------------------------------------------------------------------------

describe('POST /api/v1/photo-album', () => {
  it('creates an album with the requested name and a UUID album ID', async () => {
    const res = await request(testApp.app.getHttpServer())
      .post('/api/v1/photo-album')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Holiday 2024' })
      .expect(201)

    expect(res.body.name).toBe('Holiday 2024')
    expect(res.body.photoAlbumId).toMatch(/^[0-9a-f-]{36}$/)
    expect(res.body.id).toEqual(expect.any(Number))
  })

  it('creates a second album with its own identity when the name repeats', async () => {
    const first = await createAlbum('Duplicate Name')
    const second = await createAlbum('Duplicate Name')

    expect(second.id).not.toBe(first.id)
    expect(second.photoAlbumId).not.toBe(first.photoAlbumId)
  })

  it('returns 400 when the name is missing', () => {
    return request(testApp.app.getHttpServer())
      .post('/api/v1/photo-album')
      .set('Authorization', `Bearer ${authToken}`)
      .send({})
      .expect(400)
  })

  it('returns 401 without auth', () => {
    return request(testApp.app.getHttpServer())
      .post('/api/v1/photo-album')
      .send({ name: 'Unauthorized' })
      .expect(401)
  })
})

// -------------------------------------------------------------------------
// GET /api/v1/photo-album/:id
// -------------------------------------------------------------------------

describe('GET /api/v1/photo-album/:id', () => {
  it('returns the album addressed by its row ID', async () => {
    const album = await createAlbum('Readable Album')

    const res = await request(testApp.app.getHttpServer())
      .get(`/api/v1/photo-album/${album.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body.id).toBe(album.id)
    expect(res.body.name).toBe('Readable Album')
  })

  it('returns 404 for an album that does not exist', () => {
    return request(testApp.app.getHttpServer())
      .get('/api/v1/photo-album/999999')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404)
  })

  it('returns 401 without auth', () => {
    return request(testApp.app.getHttpServer())
      .get('/api/v1/photo-album/1')
      .expect(401)
  })
})

// -------------------------------------------------------------------------
// GET /api/v1/photo-albums
// -------------------------------------------------------------------------

describe('GET /api/v1/photo-albums', () => {
  it('returns a [albums, count] tuple', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/photo-albums')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body).toHaveLength(2)
    expect(Array.isArray(res.body[0])).toBe(true)
    expect(typeof res.body[1]).toBe('number')
  })

  it('attaches the entry count to every album it returns', async () => {
    const album = await createAlbum('Counted Album')
    await addPhotoToAlbums(photos[0], [album.id])

    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/photo-albums?take=100')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    const found = res.body[0].find((a) => a.id === album.id)
    expect(found.numEntries).toBe(1)
  })

  it('reports zero entries for an album that holds no photos', async () => {
    const album = await createAlbum('Empty Album')

    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/photo-albums?take=100')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    const found = res.body[0].find((a) => a.id === album.id)
    expect(found.numEntries).toBe(0)
  })

  it('limits the page to the requested size', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/photo-albums?take=1')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body[0]).toHaveLength(1)
    expect(res.body[1]).toBeGreaterThan(1)
  })

  it('rejects an ordering column that is not on the allow list', () => {
    return request(testApp.app.getHttpServer())
      .get('/api/v1/photo-albums?orderBy=name')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(400)
  })

  it('returns 401 without auth', () => {
    return request(testApp.app.getHttpServer())
      .get('/api/v1/photo-albums')
      .expect(401)
  })
})

// -------------------------------------------------------------------------
// GET /api/v1/photo-albums/count
// -------------------------------------------------------------------------

describe('GET /api/v1/photo-albums/count', () => {
  it('returns a count that matches the number of albums in the list response', async () => {
    const listRes = await request(testApp.app.getHttpServer())
      .get('/api/v1/photo-albums?take=1')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    const countRes = await request(testApp.app.getHttpServer())
      .get('/api/v1/photo-albums/count')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(Number(countRes.text)).toBe(listRes.body[1])
  })

  it('grows by one when a new album is created', async () => {
    const before = await request(testApp.app.getHttpServer())
      .get('/api/v1/photo-albums/count')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    await createAlbum('Counter Increment')

    const after = await request(testApp.app.getHttpServer())
      .get('/api/v1/photo-albums/count')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(Number(after.text)).toBe(Number(before.text) + 1)
  })

  it('returns 401 without auth', () => {
    return request(testApp.app.getHttpServer())
      .get('/api/v1/photo-albums/count')
      .expect(401)
  })
})

// -------------------------------------------------------------------------
// PATCH /api/v1/photo-album/:id
// -------------------------------------------------------------------------

describe('PATCH /api/v1/photo-album/:id', () => {
  it('renames the album and returns the updated entity', async () => {
    const album = await createAlbum('Before Rename')

    const res = await request(testApp.app.getHttpServer())
      .patch(`/api/v1/photo-album/${album.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'After Rename' })
      .expect(200)

    expect(res.body.name).toBe('After Rename')
    expect(res.body.id).toBe(album.id)
  })

  it('persists the rename for later reads', async () => {
    const album = await createAlbum('Persist Before')

    await request(testApp.app.getHttpServer())
      .patch(`/api/v1/photo-album/${album.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Persist After' })
      .expect(200)

    const res = await request(testApp.app.getHttpServer())
      .get(`/api/v1/photo-album/${album.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body.name).toBe('Persist After')
  })

  it('leaves the album ID untouched by a rename', async () => {
    const album = await createAlbum('Stable Identity')

    const res = await request(testApp.app.getHttpServer())
      .patch(`/api/v1/photo-album/${album.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Stable Identity Renamed' })
      .expect(200)

    expect(res.body.photoAlbumId).toBe(album.photoAlbumId)
  })

  it('returns 404 for an album that does not exist', () => {
    return request(testApp.app.getHttpServer())
      .patch('/api/v1/photo-album/999999')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Nothing' })
      .expect(404)
  })

  it('returns 401 without auth', () => {
    return request(testApp.app.getHttpServer())
      .patch('/api/v1/photo-album/1')
      .send({ name: 'Unauthorized' })
      .expect(401)
  })
})

// -------------------------------------------------------------------------
// GET /api/v1/photo-album/:id/entries
// -------------------------------------------------------------------------

describe('GET /api/v1/photo-album/:id/entries', () => {
  let albumId: number

  beforeAll(async () => {
    const album = await createAlbum('Entries Album')
    albumId = album.id

    await addPhotoToAlbums(photos[0], [albumId])
    await addPhotoToAlbums(photos[1], [albumId])
  })

  it('returns an [entries, count] tuple holding every photo in the album', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get(`/api/v1/photo-album/${albumId}/entries`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body).toHaveLength(2)
    expect(res.body[1]).toBe(2)
    expect(res.body[0]).toHaveLength(2)
  })

  it('omits the photo relation unless joinPhoto is asked for', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get(`/api/v1/photo-album/${albumId}/entries`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body[0][0].photo).toBeUndefined()
  })

  it('joins the photo entity when joinPhoto=true', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get(`/api/v1/photo-album/${albumId}/entries?joinPhoto=true`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body[0][0].photo).toBeTruthy()
    expect(res.body[0][0].photo.photoId).toEqual(expect.any(String))
  })

  it('joins the parent album when joinPhotoAlbum=true', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get(`/api/v1/photo-album/${albumId}/entries?joinPhotoAlbum=true`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body[0][0].photoAlbum.id).toBe(albumId)
  })

  it('returns only the featured entry when featured=true', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get(`/api/v1/photo-album/${albumId}/entries?featured=true`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body[1]).toBe(1)
    expect(res.body[0][0].featured).toBe(true)
  })

  it('returns the non-featured entries when featured=false', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get(`/api/v1/photo-album/${albumId}/entries?featured=false`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body[1]).toBe(1)
    expect(res.body[0][0].featured).toBe(false)
  })

  it('limits the page to the requested size while reporting the full count', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get(`/api/v1/photo-album/${albumId}/entries?take=1`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body[0]).toHaveLength(1)
    expect(res.body[1]).toBe(2)
  })

  it('returns an empty list for an album that holds no photos', async () => {
    const album = await createAlbum('No Entries')

    const res = await request(testApp.app.getHttpServer())
      .get(`/api/v1/photo-album/${album.id}/entries`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body[0]).toHaveLength(0)
    expect(res.body[1]).toBe(0)
  })

  it('returns 404 for an album that does not exist', () => {
    return request(testApp.app.getHttpServer())
      .get('/api/v1/photo-album/999999/entries')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404)
  })

  it('returns 401 without auth', () => {
    return request(testApp.app.getHttpServer())
      .get(`/api/v1/photo-album/${albumId}/entries`)
      .expect(401)
  })
})

// -------------------------------------------------------------------------
// DELETE /api/v1/photo-album/:id
// -------------------------------------------------------------------------

describe('DELETE /api/v1/photo-album/:id', () => {
  it('deletes an empty album', async () => {
    const album = await createAlbum('Delete Me Empty')

    await request(testApp.app.getHttpServer())
      .delete(`/api/v1/photo-album/${album.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    await request(testApp.app.getHttpServer())
      .get(`/api/v1/photo-album/${album.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404)
  })

  it('deletes an album that holds photos', async () => {
    const album = await createAlbum('Delete Me Full')
    await addPhotoToAlbums(photos[0], [album.id])

    await request(testApp.app.getHttpServer())
      .delete(`/api/v1/photo-album/${album.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    await request(testApp.app.getHttpServer())
      .get(`/api/v1/photo-album/${album.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404)
  })

  it('leaves the photos themselves indexed after their album is deleted', async () => {
    const album = await createAlbum('Delete Keeps Photos')
    await addPhotoToAlbums(photos[0], [album.id])

    await request(testApp.app.getHttpServer())
      .delete(`/api/v1/photo-album/${album.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/photos/count')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(Number(res.text)).toBe(photos.length)
  })

  it('drops the album from the albums count', async () => {
    const album = await createAlbum('Delete Decrements')

    const before = await request(testApp.app.getHttpServer())
      .get('/api/v1/photo-albums/count')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    await request(testApp.app.getHttpServer())
      .delete(`/api/v1/photo-album/${album.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    const after = await request(testApp.app.getHttpServer())
      .get('/api/v1/photo-albums/count')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(Number(after.text)).toBe(Number(before.text) - 1)
  })

  it('returns 404 for an album that does not exist', () => {
    return request(testApp.app.getHttpServer())
      .delete('/api/v1/photo-album/999999')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404)
  })

  it('returns 401 without auth', () => {
    return request(testApp.app.getHttpServer())
      .delete('/api/v1/photo-album/1')
      .expect(401)
  })
})

// -------------------------------------------------------------------------
// PhotoAlbumEntryService.removeEntriesFromPhotoAlbum()
//
// No route reaches this yet, so it is exercised straight off the service.
// -------------------------------------------------------------------------

describe('PhotoAlbumEntryService.removeEntriesFromPhotoAlbum()', () => {
  let entryService: PhotoAlbumEntryService
  let albumRepository: Repository<PhotoAlbum>
  let entryRepository: Repository<PhotoAlbumEntry>

  beforeAll(() => {
    entryService = testApp.moduleRef.get(PhotoAlbumEntryService)
    albumRepository = testApp.moduleRef.get(getRepositoryToken(PhotoAlbum))
    entryRepository = testApp.moduleRef.get(getRepositoryToken(PhotoAlbumEntry))
  })

  /**
   * Builds an album holding the given photos and returns it with its entries.
   */
  async function albumWithEntries(name: string, members: Photo[]): Promise<{ id: number, entryIds: number[] }> {
    const album = await createAlbum(name)

    for (const photo of members) {
      await addPhotoToAlbums(photo, [album.id])
    }

    const entries = await entryRepository.find({ where: { photoAlbum: { id: album.id } } })

    return { id: album.id, entryIds: entries.map((entry) => entry.id) }
  }

  it('removes the requested entries and keeps the album row', async () => {
    const album = await albumWithEntries('Entry Removal', [photos[0], photos[1]])

    const result = await entryService.removeEntriesFromPhotoAlbum(album.id, album.entryIds)

    expect(result).toBe(true)
    expect(await entryRepository.find({ where: { photoAlbum: { id: album.id } } })).toHaveLength(0)
    expect(await albumRepository.findOneBy({ id: album.id })).toBeTruthy()
  })

  it('leaves the photos themselves indexed', async () => {
    const album = await albumWithEntries('Entry Removal Keeps Photos', [photos[0]])

    await entryService.removeEntriesFromPhotoAlbum(album.id, album.entryIds)

    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/photos/count')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(Number(res.text)).toBe(photos.length)
  })

  it('accepts a single entry ID and leaves the album\'s other entries alone', async () => {
    const album = await albumWithEntries('Entry Removal Single', [photos[0], photos[1]])

    await entryService.removeEntriesFromPhotoAlbum(album.id, album.entryIds[0])

    const remaining = await entryRepository.find({ where: { photoAlbum: { id: album.id } } })
    expect(remaining).toHaveLength(1)
    expect(remaining[0].id).toBe(album.entryIds[1])
  })

  it('ignores entries that belong to another album', async () => {
    const target = await albumWithEntries('Entry Removal Target', [photos[0]])
    const bystander = await albumWithEntries('Entry Removal Bystander', [photos[1]])

    const result = await entryService.removeEntriesFromPhotoAlbum(target.id, bystander.entryIds)

    expect(result).toBe(false)
    expect(await entryRepository.find({ where: { photoAlbum: { id: bystander.id } } })).toHaveLength(1)
    expect(await entryRepository.find({ where: { photoAlbum: { id: target.id } } })).toHaveLength(1)
  })

  it('does not touch albums whose IDs collide with the entry IDs', async () => {
    const album = await albumWithEntries('Entry Removal No Collateral', [photos[0], photos[1]])
    const idsBefore = (await albumRepository.find()).map((a) => a.id)

    await entryService.removeEntriesFromPhotoAlbum(album.id, album.entryIds)

    expect((await albumRepository.find()).map((a) => a.id)).toEqual(idsBefore)
  })
})
