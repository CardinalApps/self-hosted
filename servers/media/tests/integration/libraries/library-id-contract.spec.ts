import * as request from 'supertest'
import { v4 as uuid } from 'uuid'

import { createTestApp, destroyTestApp, TestApp } from '../../helpers/create-app'
import { UserService } from '../../../src/modules/user/user.service'

let testApp: TestApp
let authToken: string

// An all-digits param that overflows the 32 bit row ID column. Postgres throws
// on an out of range comparison where SQLite simply matches nothing.
const OVERFLOWING_ROW_ID = '99999999999999999999'

const createLibrary = async (name: string): Promise<{ id: number, libraryId: string }> => {
  const res = await request(testApp.app.getHttpServer())
    .post('/api/v1/library')
    .set('Authorization', `Bearer ${authToken}`)
    .send({ name, paths: [`/${name}`] })
    .expect(201)

  return { id: res.body.id, libraryId: res.body.libraryId }
}

beforeAll(async () => {
  testApp = await createTestApp()

  await request(testApp.app.getHttpServer())
    .post('/api/v1/setup')
    .send({ serverName: 'Library ID Contract Server', theme: 'dark', sendAnonymousUsageData: false })

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
// GET /api/v1/library/:id
// -------------------------------------------------------------------------

describe('GET /api/v1/library/:id', () => {
  let library: { id: number, libraryId: string }

  beforeAll(async () => {
    library = await createLibrary('get-contract')
  })

  it('returns the library addressed by its row ID', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get(`/api/v1/library/${library.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body.libraryId).toBe(library.libraryId)
  })

  it('returns the library addressed by its UUID library ID', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get(`/api/v1/library/${library.libraryId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body.libraryId).toBe(library.libraryId)
  })

  it('returns 404 for a row ID that does not exist', () => {
    return request(testApp.app.getHttpServer())
      .get('/api/v1/library/999999')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404)
  })

  it('returns 404 rather than 500 for a UUID that matches no library', () => {
    return request(testApp.app.getHttpServer())
      .get(`/api/v1/library/${uuid()}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404)
  })

  it('returns 404 rather than 500 for a param that is neither a row ID nor a UUID', () => {
    return request(testApp.app.getHttpServer())
      .get('/api/v1/library/not-an-identifier')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404)
  })

  it('returns 404 rather than 500 for a numeric param too large to be a row ID', () => {
    return request(testApp.app.getHttpServer())
      .get(`/api/v1/library/${OVERFLOWING_ROW_ID}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404)
  })
})

// -------------------------------------------------------------------------
// PATCH /api/v1/library/:id
// -------------------------------------------------------------------------

describe('PATCH /api/v1/library/:id', () => {
  it('updates the library addressed by its row ID', async () => {
    const library = await createLibrary('patch-row-id')

    const res = await request(testApp.app.getHttpServer())
      .patch(`/api/v1/library/${library.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Renamed By Row ID' })
      .expect(200)

    expect(res.body.name).toBe('Renamed By Row ID')
  })

  it('updates the library addressed by its UUID library ID', async () => {
    const library = await createLibrary('patch-uuid')

    const res = await request(testApp.app.getHttpServer())
      .patch(`/api/v1/library/${library.libraryId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Renamed By UUID' })
      .expect(200)

    expect(res.body.name).toBe('Renamed By UUID')
    expect(res.body.libraryId).toBe(library.libraryId)
  })

  it('returns 404 rather than 500 for a UUID that matches no library', () => {
    return request(testApp.app.getHttpServer())
      .patch(`/api/v1/library/${uuid()}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Ghost' })
      .expect(404)
  })

  it('returns 404 rather than 500 for a param that is neither a row ID nor a UUID', () => {
    return request(testApp.app.getHttpServer())
      .patch('/api/v1/library/not-an-identifier')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Ghost' })
      .expect(404)
  })

  it('returns 404 rather than 500 for a numeric param too large to be a row ID', () => {
    return request(testApp.app.getHttpServer())
      .patch(`/api/v1/library/${OVERFLOWING_ROW_ID}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Ghost' })
      .expect(404)
  })
})

// -------------------------------------------------------------------------
// DELETE /api/v1/library/:id
// -------------------------------------------------------------------------

describe('DELETE /api/v1/library/:id', () => {
  it('deletes the library addressed by its row ID', async () => {
    const library = await createLibrary('delete-row-id')

    await request(testApp.app.getHttpServer())
      .delete(`/api/v1/library/${library.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    await request(testApp.app.getHttpServer())
      .get(`/api/v1/library/${library.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404)
  })

  it('deletes the library addressed by its UUID library ID', async () => {
    const library = await createLibrary('delete-uuid')

    await request(testApp.app.getHttpServer())
      .delete(`/api/v1/library/${library.libraryId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    await request(testApp.app.getHttpServer())
      .get(`/api/v1/library/${library.libraryId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404)
  })

  it('returns 404 rather than 500 for a UUID that matches no library', () => {
    return request(testApp.app.getHttpServer())
      .delete(`/api/v1/library/${uuid()}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404)
  })

  it('returns 404 rather than 500 for a param that is neither a row ID nor a UUID', () => {
    return request(testApp.app.getHttpServer())
      .delete('/api/v1/library/not-an-identifier')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404)
  })

  it('returns 404 rather than 500 for a numeric param too large to be a row ID', () => {
    return request(testApp.app.getHttpServer())
      .delete(`/api/v1/library/${OVERFLOWING_ROW_ID}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404)
  })
})
