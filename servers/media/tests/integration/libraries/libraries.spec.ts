import * as request from 'supertest'

import { createTestApp, destroyTestApp, TestApp } from '../../helpers/create-app'
import { UserService } from '../../../src/modules/user/user.service'

let testApp: TestApp
let authToken: string

beforeAll(async () => {
  testApp = await createTestApp()

  await request(testApp.app.getHttpServer())
    .post('/api/v1/setup')
    .send({ serverName: 'Libraries Test Server', theme: 'dark', sendAnonymousUsageData: false })

  const userService = testApp.moduleRef.get(UserService)
  const guestAccount = await userService.getGuestAccount()

  const loginRes = await request(testApp.app.getHttpServer())
    .post('/api/v1/login')
    .set('cardinal-app', 'admin')
    .send({ userId: guestAccount.userId })
    .expect(201)

  authToken = loginRes.body.JWT
}, 90000)

afterAll(async () => {
  await destroyTestApp(testApp)
})

// -------------------------------------------------------------------------
// GET /api/v1/libraries
// -------------------------------------------------------------------------

describe('GET /api/v1/libraries', () => {
  it('returns 200 with an array', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/libraries')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(Array.isArray(res.body)).toBe(true)
  })

  it('returns 403 without auth', () => {
    return request(testApp.app.getHttpServer())
      .get('/api/v1/libraries')
      .expect(403)
  })
})

// -------------------------------------------------------------------------
// POST /api/v1/library
// -------------------------------------------------------------------------

describe('POST /api/v1/library', () => {
  it('returns 201 with the created library', async () => {
    const res = await request(testApp.app.getHttpServer())
      .post('/api/v1/library')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'My Music', paths: ['/music'] })
      .expect(201)

    expect(res.body).toHaveProperty('libraryId')
    expect(res.body.name).toBe('My Music')
    expect(res.body.paths).toEqual(['/music'])
  })

  it('returns 400 when name is missing', () => {
    return request(testApp.app.getHttpServer())
      .post('/api/v1/library')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ paths: ['/music'] })
      .expect(400)
  })

  it('returns 400 when paths is missing', () => {
    return request(testApp.app.getHttpServer())
      .post('/api/v1/library')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'My Music' })
      .expect(400)
  })

  it('returns 403 without auth', () => {
    return request(testApp.app.getHttpServer())
      .post('/api/v1/library')
      .send({ name: 'My Music', paths: ['/music'] })
      .expect(403)
  })
})

// -------------------------------------------------------------------------
// GET /api/v1/library/:id
// -------------------------------------------------------------------------

describe('GET /api/v1/library/:id', () => {
  let libraryId: number

  beforeAll(async () => {
    const res = await request(testApp.app.getHttpServer())
      .post('/api/v1/library')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Get Test Library', paths: ['/get-test'] })

    libraryId = res.body.id
  })

  it('returns 200 with the library', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get(`/api/v1/library/${libraryId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body).toHaveProperty('libraryId')
    expect(res.body.name).toBe('Get Test Library')
  })

  it('returns 403 without auth', () => {
    return request(testApp.app.getHttpServer())
      .get(`/api/v1/library/${libraryId}`)
      .expect(403)
  })
})

// -------------------------------------------------------------------------
// PATCH /api/v1/library/:id
// -------------------------------------------------------------------------

describe('PATCH /api/v1/library/:id', () => {
  let libraryId: number

  beforeAll(async () => {
    const res = await request(testApp.app.getHttpServer())
      .post('/api/v1/library')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Patch Test Library', paths: ['/patch-test'] })

    libraryId = res.body.id
  })

  it('returns 200 with the updated library when name is changed', async () => {
    const res = await request(testApp.app.getHttpServer())
      .patch(`/api/v1/library/${libraryId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Updated Library' })
      .expect(200)

    expect(res.body.name).toBe('Updated Library')
  })

  it('returns 200 with the updated library when paths are changed', async () => {
    const res = await request(testApp.app.getHttpServer())
      .patch(`/api/v1/library/${libraryId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ paths: ['/new-path'] })
      .expect(200)

    expect(res.body.paths).toEqual(['/new-path'])
  })

  it('returns 400 when body is empty', () => {
    return request(testApp.app.getHttpServer())
      .patch(`/api/v1/library/${libraryId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({})
      .expect(400)
  })

  it('returns 404 for a non-existent library', () => {
    return request(testApp.app.getHttpServer())
      .patch('/api/v1/library/999999')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Ghost' })
      .expect(404)
  })

  it('returns 403 without auth', () => {
    return request(testApp.app.getHttpServer())
      .patch(`/api/v1/library/${libraryId}`)
      .send({ name: 'Updated Library' })
      .expect(403)
  })
})

// -------------------------------------------------------------------------
// DELETE /api/v1/library/:id
// -------------------------------------------------------------------------

describe('DELETE /api/v1/library/:id', () => {
  let libraryId: number

  beforeAll(async () => {
    const res = await request(testApp.app.getHttpServer())
      .post('/api/v1/library')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Delete Test Library', paths: ['/delete-test'] })

    libraryId = res.body.id
  })

  it('returns 404 for a non-existent library', () => {
    return request(testApp.app.getHttpServer())
      .delete('/api/v1/library/999999')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404)
  })

  it('returns 403 without auth', () => {
    return request(testApp.app.getHttpServer())
      .delete(`/api/v1/library/${libraryId}`)
      .expect(403)
  })

  it('returns 200 and removes the library', async () => {
    await request(testApp.app.getHttpServer())
      .delete(`/api/v1/library/${libraryId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    await request(testApp.app.getHttpServer())
      .get(`/api/v1/library/${libraryId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404)
  })
})
