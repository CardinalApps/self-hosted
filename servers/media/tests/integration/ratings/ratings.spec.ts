import * as request from 'supertest'

import { createTestApp, destroyTestApp, TestApp } from '../../helpers/create-app'
import { UserService } from '../../../src/modules/user/user.service'
import { RatingMediaType } from '../../../src/modules/rating/rating.entity'

let testApp: TestApp
let authToken: string

beforeAll(async () => {
  testApp = await createTestApp()

  await request(testApp.app.getHttpServer())
    .post('/api/v1/setup')
    .send({ serverName: 'Ratings Test Server', theme: 'dark', sendAnonymousUsageData: false })

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
// GET /api/v1/ratings
// -------------------------------------------------------------------------

describe('GET /api/v1/ratings', () => {
  it('returns 200 with a [ratings, count] tuple', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/ratings')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body).toHaveLength(2)
    expect(Array.isArray(res.body[0])).toBe(true)
    expect(typeof res.body[1]).toBe('number')
  })

  it('returns 403 without auth', () => {
    return request(testApp.app.getHttpServer())
      .get('/api/v1/ratings')
      .expect(403)
  })
})

// -------------------------------------------------------------------------
// PUT /api/v1/ratings
// -------------------------------------------------------------------------

describe('PUT /api/v1/ratings', () => {
  it('returns 200 with the created rating', async () => {
    const res = await request(testApp.app.getHttpServer())
      .put('/api/v1/ratings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ mediaType: RatingMediaType.MUSIC_TRACK, mediaId: 'test-track-1', rating: 1 })
      .expect(200)

    expect(res.body).toHaveProperty('ratingId')
    expect(res.body.mediaType).toBe(RatingMediaType.MUSIC_TRACK)
    expect(res.body.mediaId).toBe('test-track-1')
    expect(res.body.rating).toBe(1)
  })

  it('updates an existing rating when called again for the same media item', async () => {
    await request(testApp.app.getHttpServer())
      .put('/api/v1/ratings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ mediaType: RatingMediaType.MUSIC_TRACK, mediaId: 'test-track-upsert', rating: 1 })

    const res = await request(testApp.app.getHttpServer())
      .put('/api/v1/ratings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ mediaType: RatingMediaType.MUSIC_TRACK, mediaId: 'test-track-upsert', rating: 0 })
      .expect(200)

    expect(res.body.rating).toBe(0)
  })

  it('returns 400 when mediaType is invalid', () => {
    return request(testApp.app.getHttpServer())
      .put('/api/v1/ratings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ mediaType: 'invalid_type', mediaId: 'test-track-1', rating: 1 })
      .expect(400)
  })

  it('returns 400 when rating is out of range', () => {
    return request(testApp.app.getHttpServer())
      .put('/api/v1/ratings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ mediaType: RatingMediaType.MUSIC_TRACK, mediaId: 'test-track-1', rating: 5 })
      .expect(400)
  })

  it('returns 400 when mediaId is missing', () => {
    return request(testApp.app.getHttpServer())
      .put('/api/v1/ratings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ mediaType: RatingMediaType.MUSIC_TRACK, rating: 1 })
      .expect(400)
  })

  it('returns 403 without auth', () => {
    return request(testApp.app.getHttpServer())
      .put('/api/v1/ratings')
      .send({ mediaType: RatingMediaType.MUSIC_TRACK, mediaId: 'test-track-1', rating: 1 })
      .expect(403)
  })
})

// -------------------------------------------------------------------------
// DELETE /api/v1/ratings/:mediaType/:mediaId
// -------------------------------------------------------------------------

describe('DELETE /api/v1/ratings/:mediaType/:mediaId', () => {
  const mediaId = 'test-track-delete'

  beforeAll(async () => {
    await request(testApp.app.getHttpServer())
      .put('/api/v1/ratings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ mediaType: RatingMediaType.MUSIC_TRACK, mediaId, rating: 1 })
  })

  it('returns 200 and removes the rating', async () => {
    await request(testApp.app.getHttpServer())
      .delete(`/api/v1/ratings/${RatingMediaType.MUSIC_TRACK}/${mediaId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/ratings')
      .set('Authorization', `Bearer ${authToken}`)

    const found = res.body[0].find((r) => r.mediaId === mediaId)
    expect(found).toBeUndefined()
  })

  it('returns 403 without auth', () => {
    return request(testApp.app.getHttpServer())
      .delete(`/api/v1/ratings/${RatingMediaType.MUSIC_TRACK}/${mediaId}`)
      .expect(403)
  })
})
