import * as request from 'supertest'

import { createTestApp, destroyTestApp, TestApp } from '../../helpers/create-app'
import { UserService } from '../../../src/modules/user/user.service'

let testApp: TestApp
let authToken: string

beforeAll(async () => {
  testApp = await createTestApp()

  await request(testApp.app.getHttpServer())
    .post('/api/v1/setup')
    .send({ serverName: 'Playback Queues Test Server', theme: 'dark', sendAnonymousUsageData: false })

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
// GET /api/v1/playback-queues
// -------------------------------------------------------------------------

describe('GET /api/v1/playback-queues', () => {
  it('returns 200 with a [queues, count] tuple', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/v1/playback-queues')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body).toHaveLength(2)
    expect(Array.isArray(res.body[0])).toBe(true)
    expect(typeof res.body[1]).toBe('number')
  })

  it('returns 403 without auth', () => {
    return request(testApp.app.getHttpServer())
      .get('/api/v1/playback-queues')
      .expect(401)
  })
})

// -------------------------------------------------------------------------
// POST /api/v1/playback-queues
// -------------------------------------------------------------------------

describe('POST /api/v1/playback-queues', () => {
  it('returns 201 with a static queue', async () => {
    const res = await request(testApp.app.getHttpServer())
      .post('/api/v1/playback-queues')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ type: 'static' })
      .expect(201)

    expect(res.body).toHaveProperty('queueId')
    expect(res.body.type).toBe('static')
  })

  it('returns 201 with a dynamic queue', async () => {
    const res = await request(testApp.app.getHttpServer())
      .post('/api/v1/playback-queues')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ type: 'dynamic', dynamicType: 'true_shuffle' })
      .expect(201)

    expect(res.body.type).toBe('dynamic')
    expect(res.body.dynamicType).toBe('true_shuffle')
  })

  it('returns 400 when type is missing', () => {
    return request(testApp.app.getHttpServer())
      .post('/api/v1/playback-queues')
      .set('Authorization', `Bearer ${authToken}`)
      .send({})
      .expect(400)
  })

  it('returns 403 without auth', () => {
    return request(testApp.app.getHttpServer())
      .post('/api/v1/playback-queues')
      .send({ type: 'static' })
      .expect(401)
  })
})

// -------------------------------------------------------------------------
// GET /api/v1/playback-queues/:id
// -------------------------------------------------------------------------

describe('GET /api/v1/playback-queues/:id', () => {
  let queueId: string

  beforeAll(async () => {
    const res = await request(testApp.app.getHttpServer())
      .post('/api/v1/playback-queues')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ type: 'static' })

    queueId = res.body.queueId
  })

  it('returns 200 with the queue', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get(`/api/v1/playback-queues/${queueId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(res.body.queueId).toBe(queueId)
  })

  it('returns 404 for a non-existent queue', () => {
    return request(testApp.app.getHttpServer())
      .get('/api/v1/playback-queues/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404)
  })

  it('returns 403 without auth', () => {
    return request(testApp.app.getHttpServer())
      .get(`/api/v1/playback-queues/${queueId}`)
      .expect(401)
  })
})

// -------------------------------------------------------------------------
// DELETE /api/v1/playback-queues/:id
// -------------------------------------------------------------------------

describe('DELETE /api/v1/playback-queues/:id', () => {
  let queueId: string

  beforeAll(async () => {
    const res = await request(testApp.app.getHttpServer())
      .post('/api/v1/playback-queues')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ type: 'static' })

    queueId = res.body.queueId
  })

  it('returns 200 and removes the queue', async () => {
    await request(testApp.app.getHttpServer())
      .delete(`/api/v1/playback-queues/${queueId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    await request(testApp.app.getHttpServer())
      .get(`/api/v1/playback-queues/${queueId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404)
  })

  it('returns 403 without auth', () => {
    return request(testApp.app.getHttpServer())
      .delete(`/api/v1/playback-queues/${queueId}`)
      .expect(401)
  })
})

// -------------------------------------------------------------------------
// POST /api/v1/playback-queues/:id/extend
// -------------------------------------------------------------------------

describe('POST /api/v1/playback-queues/:id/extend', () => {
  let queueId: string

  beforeAll(async () => {
    const res = await request(testApp.app.getHttpServer())
      .post('/api/v1/playback-queues')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ type: 'dynamic', dynamicType: 'true_shuffle' })

    queueId = res.body.queueId
  })

  it('returns 201', async () => {
    await request(testApp.app.getHttpServer())
      .post(`/api/v1/playback-queues/${queueId}/extend`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({})
      .expect(201)
  })

  it('returns 403 without auth', () => {
    return request(testApp.app.getHttpServer())
      .post(`/api/v1/playback-queues/${queueId}/extend`)
      .send({})
      .expect(401)
  })
})

// -------------------------------------------------------------------------
// GET /api/v1/playback-queues/:id/items
// -------------------------------------------------------------------------

describe('GET /api/v1/playback-queues/:id/items', () => {
  let queueId: string

  beforeAll(async () => {
    const res = await request(testApp.app.getHttpServer())
      .post('/api/v1/playback-queues')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ type: 'static' })

    queueId = res.body.queueId
  })

  it('returns 200 with a [items, count] tuple', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get(`/api/v1/playback-queues/${queueId}/items`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body).toHaveLength(2)
    expect(Array.isArray(res.body[0])).toBe(true)
    expect(typeof res.body[1]).toBe('number')
  })

  it('returns 403 without auth', () => {
    return request(testApp.app.getHttpServer())
      .get(`/api/v1/playback-queues/${queueId}/items`)
      .expect(401)
  })
})

// -------------------------------------------------------------------------
// PATCH /api/v1/playback-queues/:id/items/:queueItemId
// -------------------------------------------------------------------------

describe('PATCH /api/v1/playback-queues/:id/items/:queueItemId', () => {
  const trackIds = ['track-a', 'track-b', 'track-c', 'track-d', 'track-e']

  /**
   * Creates a fresh 5 item static queue so that each reorder test starts from a
   * known order. Static queue items carry an arbitrary mediaId, so the queue does
   * not depend on any indexed music.
   */
  const createQueue = async (): Promise<string> => {
    const res = await request(testApp.app.getHttpServer())
      .post('/api/v1/playback-queues')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        type: 'static',
        staticItems: trackIds.map((mediaId) => ({ mediaId, mediaType: 'music_track' })),
      })
      .expect(201)

    return res.body.queueId
  }

  /**
   * Returns the queue's mediaIds in playback order.
   */
  const getOrder = async (queueId: string): Promise<string[]> => {
    const res = await request(testApp.app.getHttpServer())
      .get(`/api/v1/playback-queues/${queueId}/items`)
      .query({ leading: 50, includeCurrentItemInReturn: true })
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    return res.body[0].map((item) => item.mediaId)
  }

  /**
   * Returns the queue's items in playback order.
   */
  const getItems = async (queueId: string) => {
    const res = await request(testApp.app.getHttpServer())
      .get(`/api/v1/playback-queues/${queueId}/items`)
      .query({ leading: 50, includeCurrentItemInReturn: true })
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    return res.body[0]
  }

  /**
   * Moves an item so that it sits directly behind another one.
   */
  const moveAfter = async (queueId: string, queueItemId: string, afterQueueItemId: string, expectStatus = 200) => {
    return await request(testApp.app.getHttpServer())
      .patch(`/api/v1/playback-queues/${queueId}/items/${queueItemId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ afterQueueItemId })
      .expect(expectStatus)
  }

  it('moves an item later in the queue', async () => {
    const queueId = await createQueue()
    const [trackA, trackB, trackC, trackD] = await getItems(queueId)

    await moveAfter(queueId, trackB.queueItemId, trackD.queueItemId)

    expect(await getOrder(queueId)).toEqual(['track-a', 'track-c', 'track-d', 'track-b', 'track-e'])
    expect(trackA).toBeDefined()
    expect(trackC).toBeDefined()
  })

  it('moves an item earlier in the queue', async () => {
    const queueId = await createQueue()
    const [trackA, , , trackD] = await getItems(queueId)

    await moveAfter(queueId, trackD.queueItemId, trackA.queueItemId)

    expect(await getOrder(queueId)).toEqual(['track-a', 'track-d', 'track-b', 'track-c', 'track-e'])
  })

  it('moves an item to the very end of the queue', async () => {
    const queueId = await createQueue()
    const [trackA, , , , trackE] = await getItems(queueId)

    await moveAfter(queueId, trackA.queueItemId, trackE.queueItemId)

    expect(await getOrder(queueId)).toEqual(['track-b', 'track-c', 'track-d', 'track-e', 'track-a'])
  })

  it('leaves the order alone when an item is moved behind the item it already follows', async () => {
    const queueId = await createQueue()
    const [, trackB, trackC] = await getItems(queueId)

    await moveAfter(queueId, trackC.queueItemId, trackB.queueItemId)

    expect(await getOrder(queueId)).toEqual(trackIds)
  })

  /**
   * The whole point of fractional positions: a move is O(1) writes, not O(n).
   */
  it('rewrites only the moved item, leaving every other position untouched', async () => {
    const queueId = await createQueue()
    const before = await getItems(queueId)
    const [, trackB, , trackD] = before

    await moveAfter(queueId, trackB.queueItemId, trackD.queueItemId)

    const after = await getItems(queueId)
    const positionOf = (items, mediaId) => items.find((item) => item.mediaId === mediaId).position

    for (const mediaId of ['track-a', 'track-c', 'track-d', 'track-e']) {
      expect(positionOf(after, mediaId)).toBe(positionOf(before, mediaId))
    }

    expect(positionOf(after, 'track-b')).not.toBe(positionOf(before, 'track-b'))
  })

  it('lands a moved item strictly between its new neighbours', async () => {
    const queueId = await createQueue()
    const [trackA, trackB, trackC] = await getItems(queueId)

    await moveAfter(queueId, trackB.queueItemId, trackA.queueItemId)

    const after = await getItems(queueId)
    const moved = after.find((item) => item.mediaId === 'track-b')

    expect(moved.position).toBeGreaterThan(trackA.position)
    expect(moved.position).toBeLessThan(trackC.position)
  })

  /**
   * Halving one gap enough times exhausts the mantissa (~52 moves), at which point the
   * midpoint stops landing strictly between its neighbours and the queue has to be
   * spread back out, or two items silently end up sharing a position.
   *
   * Two items are alternated into the gap because a lone item would simply be handed
   * back the same midpoint every time: the item being moved is excluded when its new
   * neighbour is resolved, so it never actually narrows the gap it sits in.
   */
  it('survives one gap being subdivided until it runs out of room', async () => {
    const queueId = await createQueue()
    const [, trackB] = await getItems(queueId)

    // Well past the ~52 halvings a double can take, so the queue has to rebalance
    const moves = 120

    for (let i = 0; i < moves; i++) {
      const items = await getItems(queueId)
      const mediaId = i % 2 === 0 ? 'track-d' : 'track-e'
      const item = items.find((queueItem) => queueItem.mediaId === mediaId)

      await moveAfter(queueId, item.queueItemId, trackB.queueItemId)

      /*
        Checked on every move, not just at the end: when the midpoint collapses onto a
        neighbour the two items share a position only until the next move happens to
        pull them apart again, so the damage is invisible by the time the loop is over.
      */
      const after = await getItems(queueId)
      const positions = after.map((queueItem) => queueItem.position)

      expect(new Set(positions).size).toBe(positions.length)
      expect([...positions].sort((a, b) => a - b)).toEqual(positions)

      // Once both tracks have been pulled into the gap they just swap places each move
      if (i > 0) {
        expect(after.map((queueItem) => queueItem.mediaId)).toEqual(
          i % 2 === 0
            ? ['track-a', 'track-b', 'track-d', 'track-e', 'track-c']
            : ['track-a', 'track-b', 'track-e', 'track-d', 'track-c'],
        )
      }
    }
  })

  it('returns 404 for an item that is not in the queue', async () => {
    const queueId = await createQueue()
    const [trackA] = await getItems(queueId)

    await moveAfter(queueId, '00000000-0000-0000-0000-000000000000', trackA.queueItemId, 404)
  })

  it('returns 404 when the item it was dropped behind is not in the queue', async () => {
    const queueId = await createQueue()
    const [trackA] = await getItems(queueId)

    await moveAfter(queueId, trackA.queueItemId, '00000000-0000-0000-0000-000000000000', 404)
  })

  it('returns 400 when an item is moved behind itself', async () => {
    const queueId = await createQueue()
    const [trackA] = await getItems(queueId)

    await moveAfter(queueId, trackA.queueItemId, trackA.queueItemId, 400)
  })

  it('returns 400 when afterQueueItemId is missing', async () => {
    const queueId = await createQueue()
    const [trackA] = await getItems(queueId)

    await request(testApp.app.getHttpServer())
      .patch(`/api/v1/playback-queues/${queueId}/items/${trackA.queueItemId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({})
      .expect(400)
  })

  it('returns 401 without auth', async () => {
    const queueId = await createQueue()
    const [trackA, trackB] = await getItems(queueId)

    await request(testApp.app.getHttpServer())
      .patch(`/api/v1/playback-queues/${queueId}/items/${trackB.queueItemId}`)
      .send({ afterQueueItemId: trackA.queueItemId })
      .expect(401)
  })
})
