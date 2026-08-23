import * as fs from 'fs'
import * as path from 'path'
import * as request from 'supertest'
import { v4 as uuid } from 'uuid'

import { createTestApp, destroyTestApp, TestApp } from '../../helpers/create-app'
import { UserService } from '../../../src/modules/user/user.service'
import { OutputCacheDirectories } from '../../../src/modules/thumbnail/enums'
import { getAppDir, touchAppDir } from '../../../src/utils/env'

/*
 * DELETE /thumbnails empties the thumbnail cache directory inside the app data
 * directory, which is a fixed per-platform path rather than anything the test
 * harness can redirect. These specs therefore write and then assert on their own
 * uniquely named files, and the endpoint clears the whole directory as designed
 * — a regenerable cache belonging to the local development server.
 */
const THUMBNAIL_CACHE_DIR = getAppDir(OutputCacheDirectories.PHOTO_THUMBNAILS)

let testApp: TestApp
let authToken: string

/**
 * Writes a placeholder file into the thumbnail cache and returns its path.
 */
function seedCachedThumbnailFile(): string {
  touchAppDir([OutputCacheDirectories.PHOTO_THUMBNAILS])
  const filePath = path.join(THUMBNAIL_CACHE_DIR, `integration-test-${uuid()}.jpeg`)
  fs.writeFileSync(filePath, Buffer.from([0xff, 0xd8, 0xff, 0xd9]))
  return filePath
}

beforeAll(async () => {
  testApp = await createTestApp()

  await request(testApp.app.getHttpServer())
    .post('/api/v1/setup')
    .send({ serverName: 'Thumbnails Test Server', theme: 'dark', sendAnonymousUsageData: false })

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
  await destroyTestApp(testApp)
})

// -------------------------------------------------------------------------
// DELETE /api/v1/thumbnails
// -------------------------------------------------------------------------

describe('DELETE /api/v1/thumbnails', () => {
  it('creates the thumbnail cache directory when the server boots', () => {
    expect(fs.existsSync(THUMBNAIL_CACHE_DIR)).toBe(true)
  })

  it('deletes the cached thumbnail files from the disk', async () => {
    const filePath = seedCachedThumbnailFile()
    expect(fs.existsSync(filePath)).toBe(true)

    await request(testApp.app.getHttpServer())
      .delete('/api/v1/thumbnails')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(fs.existsSync(filePath)).toBe(false)
  })

  it('leaves the cache directory itself in place', async () => {
    seedCachedThumbnailFile()

    await request(testApp.app.getHttpServer())
      .delete('/api/v1/thumbnails')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(fs.existsSync(THUMBNAIL_CACHE_DIR)).toBe(true)
    expect(fs.readdirSync(THUMBNAIL_CACHE_DIR)).toHaveLength(0)
  })

  it('succeeds when the cache is already empty', () => {
    return request(testApp.app.getHttpServer())
      .delete('/api/v1/thumbnails')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)
  })

  it('returns 401 without auth', () => {
    return request(testApp.app.getHttpServer())
      .delete('/api/v1/thumbnails')
      .expect(401)
  })
})
