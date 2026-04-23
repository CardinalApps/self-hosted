import * as request from 'supertest'

import { createTestApp, destroyTestApp, TestApp } from '../../helpers/create-app'
import { UserService } from '../../../src/modules/user/user.service'
import { JobType, JobStatus } from '../../../src/modules/job/enums'

let testApp: TestApp
let authToken: string

beforeAll(async () => {
  testApp = await createTestApp()

  await request(testApp.app.getHttpServer())
    .post('/api/v1/setup')
    .send({ serverName: 'Jobs Test Server', theme: 'dark', sendAnonymousUsageData: false })

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
// GET /api/v1/jobs/types
// -------------------------------------------------------------------------

describe('GET /api/v1/jobs/types', () => {
  it('returns 200 with an array of job type strings', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/jobs/types')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body).toContain(JobType.ALBUM_ART_THUMBNAILS)
  })

  it('returns 403 without auth', () => {
    return request(testApp.app.getHttpServer())
      .get('/api/v1/jobs/types')
      .expect(403)
  })
})

// -------------------------------------------------------------------------
// GET /api/v1/jobs
// -------------------------------------------------------------------------

describe('GET /api/v1/jobs', () => {
  it('returns 200 with a [jobs, count] tuple', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/jobs')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body).toHaveLength(2)
    expect(Array.isArray(res.body[0])).toBe(true)
    expect(typeof res.body[1]).toBe('number')
  })

  it('returns 403 without auth', () => {
    return request(testApp.app.getHttpServer())
      .get('/api/v1/jobs')
      .expect(403)
  })
})

// -------------------------------------------------------------------------
// POST /api/v1/job
// -------------------------------------------------------------------------

describe('POST /api/v1/job', () => {
  it('returns 201 with the created job', async () => {
    const res = await request(testApp.app.getHttpServer())
      .post('/api/v1/job')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ type: JobType.ALBUM_ART_THUMBNAILS })
      .expect(201)

    expect(res.body).toHaveProperty('id')
    expect(res.body.type).toBe(JobType.ALBUM_ART_THUMBNAILS)
    expect(res.body.status).toBe(JobStatus.IN_QUEUE)
  })

  it('returns 400 when type is missing', () => {
    return request(testApp.app.getHttpServer())
      .post('/api/v1/job')
      .set('Authorization', `Bearer ${authToken}`)
      .send({})
      .expect(400)
  })

  it('returns 403 without auth', () => {
    return request(testApp.app.getHttpServer())
      .post('/api/v1/job')
      .send({ type: JobType.ALBUM_ART_THUMBNAILS })
      .expect(403)
  })
})

// -------------------------------------------------------------------------
// GET /api/v1/job/:id
// -------------------------------------------------------------------------

describe('GET /api/v1/job/:id', () => {
  let jobId: number

  beforeAll(async () => {
    const res = await request(testApp.app.getHttpServer())
      .post('/api/v1/job')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ type: JobType.ALBUM_ART_THUMBNAILS })

    jobId = res.body.id
  })

  it('returns 200 with the job', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get(`/api/v1/job/${jobId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body.id).toBe(jobId)
    expect(res.body.type).toBe(JobType.ALBUM_ART_THUMBNAILS)
  })

  it('returns 403 without auth', () => {
    return request(testApp.app.getHttpServer())
      .get(`/api/v1/job/${jobId}`)
      .expect(403)
  })
})

// -------------------------------------------------------------------------
// PATCH /api/v1/job/:id
// -------------------------------------------------------------------------

describe('PATCH /api/v1/job/:id', () => {
  let jobId: number

  beforeAll(async () => {
    const res = await request(testApp.app.getHttpServer())
      .post('/api/v1/job')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ type: JobType.ALBUM_ART_THUMBNAILS })

    jobId = res.body.id
  })

  it('returns 200 with the updated job when status is changed', async () => {
    const res = await request(testApp.app.getHttpServer())
      .patch(`/api/v1/job/${jobId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: JobStatus.CANCELED })
      .expect(200)

    expect(res.body.status).toBe(JobStatus.CANCELED)
  })

  it('returns 403 without auth', () => {
    return request(testApp.app.getHttpServer())
      .patch(`/api/v1/job/${jobId}`)
      .send({ status: JobStatus.CANCELED })
      .expect(403)
  })
})

// -------------------------------------------------------------------------
// GET /api/v1/job/:id/tasks
// -------------------------------------------------------------------------

describe('GET /api/v1/job/:id/tasks', () => {
  let jobId: number

  beforeAll(async () => {
    const res = await request(testApp.app.getHttpServer())
      .post('/api/v1/job')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ type: JobType.ALBUM_ART_THUMBNAILS })

    jobId = res.body.id
  })

  it('returns 200 with a [tasks, count] tuple', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get(`/api/v1/job/${jobId}/tasks`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body).toHaveLength(2)
    expect(Array.isArray(res.body[0])).toBe(true)
    expect(typeof res.body[1]).toBe('number')
  })

  it('returns 403 without auth', () => {
    return request(testApp.app.getHttpServer())
      .get(`/api/v1/job/${jobId}/tasks`)
      .expect(403)
  })
})
