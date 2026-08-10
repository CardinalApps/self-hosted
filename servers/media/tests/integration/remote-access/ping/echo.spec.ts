import * as crypto from 'crypto'
import * as request from 'supertest'

import { signProbeHeader } from '@cardinalapps/remote-access'

import { createTestApp, destroyTestApp, TestApp } from '../../../helpers/create-app'
import { DatabaseService } from '../../../../src/modules/database/database.service'
import { OPTIONS } from '../../../../src/utils/options'

const SIGNING_KEY = new Uint8Array(32).fill(7)

describe('Echo endpoint (integration)', () => {
  let testApp: TestApp
  let instanceId: string

  beforeAll(async () => {
    testApp = await createTestApp()
    const databaseService = testApp.moduleRef.get(DatabaseService)
    instanceId = await databaseService.getOption(OPTIONS.INSTANCE_ID.name) as string
    await databaseService.saveOption(OPTIONS.CONNECT_SIGNING_KEY.name, Buffer.from(SIGNING_KEY).toString('base64'))
  })

  afterAll(async () => {
    await destroyTestApp(testApp)
  })

  it('echoes the body bytes for a validly signed request', async () => {
    const signature = await signProbeHeader(SIGNING_KEY, instanceId, new Date())
    const payload = crypto.randomBytes(64 * 1024)

    const res = await request(testApp.app.getHttpServer())
      .post('/api/ping/echo')
      .set('X-Cardinal-Probe', '1')
      .set('X-Cardinal-Probe-Signature', signature)
      .set('Content-Type', 'application/octet-stream')
      .send(payload)
      .expect(200)

    expect(res.headers['x-cardinal-probe-pong']).toBe('1')
    expect(Buffer.compare(res.body, payload)).toBe(0)
  })

  it('404s without a valid signature', async () => {
    await request(testApp.app.getHttpServer())
      .post('/api/ping/echo')
      .set('Content-Type', 'application/octet-stream')
      .send(Buffer.from('hello'))
      .expect(404)
  })

  it('413s a body over the cap', async () => {
    const signature = await signProbeHeader(SIGNING_KEY, instanceId, new Date())

    await request(testApp.app.getHttpServer())
      .post('/api/ping/echo')
      .set('X-Cardinal-Probe', '1')
      .set('X-Cardinal-Probe-Signature', signature)
      .set('Content-Type', 'application/octet-stream')
      .send(crypto.randomBytes(1024 * 1024 + 1))
      .expect(413)
  })
})
