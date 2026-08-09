import * as request from 'supertest'

import { signProbeHeader } from '@cardinalapps/remote-access'

import { createTestApp, destroyTestApp, TestApp } from '../../helpers/create-app'
import { DatabaseService } from '../../../src/modules/database/database.service'
import { OPTIONS } from '../../../src/utils/options'

const SIGNING_KEY = new Uint8Array(32).fill(7)

describe('Probe endpoint (integration)', () => {
  let testApp: TestApp
  let databaseService: DatabaseService
  let instanceId: string

  beforeAll(async () => {
    testApp = await createTestApp()
    databaseService = testApp.moduleRef.get(DatabaseService)
    instanceId = await databaseService.getOption(OPTIONS.INSTANCE_ID.name) as string
  })

  afterAll(async () => {
    await destroyTestApp(testApp)
  })

  // Runs before the signing key is provisioned below
  it('404s a signed probe when no signing key is provisioned', async () => {
    const signature = await signProbeHeader(SIGNING_KEY, instanceId, new Date())

    await request(testApp.app.getHttpServer())
      .get('/api/ping')
      .set('X-Cardinal-Probe', '1')
      .set('X-Cardinal-Probe-Signature', signature)
      .expect(404)
  })

  it('200s a validly signed probe with the pong header', async () => {
    await databaseService.saveOption(OPTIONS.CONNECT_SIGNING_KEY.name, Buffer.from(SIGNING_KEY).toString('base64'))
    const signature = await signProbeHeader(SIGNING_KEY, instanceId, new Date())

    const res = await request(testApp.app.getHttpServer())
      .get('/api/ping')
      .set('X-Cardinal-Probe', '1')
      .set('X-Cardinal-Probe-Signature', signature)
      .expect(200)

    expect(res.headers['x-cardinal-probe-pong']).toBe('1')
    expect(res.body.ok).toBe(true)
  })

  it('404s a probe signed with the wrong key', async () => {
    const signature = await signProbeHeader(new Uint8Array(32).fill(8), instanceId, new Date())

    const res = await request(testApp.app.getHttpServer())
      .get('/api/ping')
      .set('X-Cardinal-Probe', '1')
      .set('X-Cardinal-Probe-Signature', signature)
      .expect(404)

    expect(res.headers['x-cardinal-probe-pong']).toBeUndefined()
  })

  it('404s a request with no probe headers', async () => {
    await request(testApp.app.getHttpServer())
      .get('/api/ping')
      .expect(404)
  })
})
