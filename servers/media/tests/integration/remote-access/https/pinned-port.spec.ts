import * as fs from 'fs'
import * as net from 'net'
import * as path from 'path'
import * as tls from 'tls'

import { createTestApp, destroyTestApp, TestApp } from '../../../helpers/create-app'
import { HttpsService } from '../../../../src/modules/remote-access/https/https.service'
import { DatabaseService } from '../../../../src/modules/database/database.service'
import { OPTIONS } from '../../../../src/utils/options'

const FIXTURES = path.join(__dirname, '..', '..', '..', 'fixtures', 'certs')
const CERT_A = fs.readFileSync(path.join(FIXTURES, 'cert-a.pem'), 'utf8')
const KEY_A = fs.readFileSync(path.join(FIXTURES, 'key-a.pem'), 'utf8')

let testApp: TestApp
let httpsService: HttpsService
let pinnedPort: number

// Borrows a free port from the OS, then hands it back for the listener to claim
async function findFreePort(): Promise<number> {
  const probe = net.createServer()
  await new Promise<void>((resolve) => probe.listen(0, '127.0.0.1', resolve))
  const { port } = probe.address() as net.AddressInfo
  await new Promise<void>((resolve) => probe.close(() => resolve()))

  return port
}

async function startListener(): Promise<void> {
  const databaseService = testApp.moduleRef.get(DatabaseService)
  await databaseService.saveOption(OPTIONS.CONNECT_ENABLED.name, 'true')
  await databaseService.saveOption(OPTIONS.CONNECT_TLS_CERT_PEM.name, CERT_A)
  await databaseService.saveOption(OPTIONS.CONNECT_TLS_KEY_PEM.name, KEY_A)

  httpsService = testApp.moduleRef.get(HttpsService)
  httpsService.attach(testApp.app.getHttpAdapter().getInstance())

  const startTime = Date.now()
  while (httpsService.getStatus().state !== 'running' && Date.now() - startTime < 5000) {
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
}

beforeAll(async () => {
  pinnedPort = await findFreePort()
  process.env.CONNECT_HTTPS_PORT = String(pinnedPort)

  testApp = await createTestApp()
  await startListener()
}, 90000)

afterAll(async () => {
  delete process.env.CONNECT_HTTPS_PORT
  await destroyTestApp(testApp)
})

describe('Remote Access HTTPS listener with a pinned port', () => {
  it('binds the pinned port instead of an OS-assigned one', () => {
    expect(httpsService.getStatus()).toMatchObject({ state: 'running', port: pinnedPort })
  })

  it('serves the API on the pinned port', async () => {
    const socket = await new Promise<tls.TLSSocket>((resolve, reject) => {
      const attempt = tls.connect({ host: '127.0.0.1', port: pinnedPort, rejectUnauthorized: false }, () => resolve(attempt))
      attempt.once('error', reject)
    })

    const response = await new Promise<string>((resolve, reject) => {
      let received = ''
      const onData = (chunk: Buffer) => {
        received += chunk.toString()
        if (received.includes('\r\n\r\n')) {
          socket.off('data', onData)
          resolve(received)
        }
      }
      socket.on('data', onData)
      socket.once('error', reject)
      socket.write('GET /api/v1/health HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: keep-alive\r\n\r\n')
    })

    expect(response).toContain('HTTP/1.1 200')

    socket.destroy()
  })

  it('rebinds the same port after a restart', async () => {
    await httpsService.stop()
    expect(httpsService.getStatus().state).toBe('stopped')

    await httpsService.maybeStart()

    expect(httpsService.getStatus()).toMatchObject({ state: 'running', port: pinnedPort })
  })
})
