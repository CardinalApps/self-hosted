import * as fs from 'fs'
import * as net from 'net'
import * as path from 'path'
import * as tls from 'tls'

import { createTestApp, destroyTestApp, TestApp } from '../../../helpers/create-app'
import { HttpsService } from '../../../../src/modules/remote-access/https/https.service'
import { MuxService } from '../../../../src/modules/remote-access/mux/mux.service'
import { DatabaseService } from '../../../../src/modules/database/database.service'
import { OPTIONS } from '../../../../src/utils/options'

const FIXTURES = path.join(__dirname, '..', '..', '..', 'fixtures', 'certs')
const CERT_A = fs.readFileSync(path.join(FIXTURES, 'cert-a.pem'), 'utf8')
const KEY_A = fs.readFileSync(path.join(FIXTURES, 'key-a.pem'), 'utf8')

let testApp: TestApp
let httpsService: HttpsService
let muxService: MuxService
let pinnedPort: number
let mainPort: number

// Borrows a free port from the OS, then hands it back for the listener to claim
async function findFreePort(): Promise<number> {
  const probe = net.createServer()
  await new Promise<void>((resolve) => probe.listen(0, '127.0.0.1', resolve))
  const { port } = probe.address() as net.AddressInfo
  await new Promise<void>((resolve) => probe.close(() => resolve()))

  return port
}

// Sends a request over an established TLS socket and returns the response head
function requestOverSocket(socket: tls.TLSSocket, urlPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let response = ''
    const onData = (chunk: Buffer) => {
      response += chunk.toString()
      if (response.includes('\r\n\r\n')) {
        socket.off('data', onData)
        resolve(response)
      }
    }
    socket.on('data', onData)
    socket.once('error', reject)
    socket.write(`GET ${urlPath} HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: keep-alive\r\n\r\n`)
  })
}

function connectTls(port: number): Promise<tls.TLSSocket> {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({ host: '127.0.0.1', port, rejectUnauthorized: false }, () => resolve(socket))
    socket.once('error', reject)
  })
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
  muxService = testApp.moduleRef.get(MuxService)
  mainPort = await muxService.listen(0, testApp.app.getHttpServer(), '127.0.0.1')
  await startListener()
}, 90000)

afterAll(async () => {
  delete process.env.CONNECT_HTTPS_PORT
  await destroyTestApp(testApp)
})

/* Pinning is legacy: the main port answers TLS on its own now. It keeps working for deployments
   whose external TLS port has to differ from the main one. */
describe('Remote Access HTTPS with a pinned port', () => {
  it('binds the pinned port as well as the main one', () => {
    expect(httpsService.getStatus()).toMatchObject({ state: 'running', port: pinnedPort })
    expect(pinnedPort).not.toBe(mainPort)
  })

  it('serves the API on the pinned port', async () => {
    const socket = await connectTls(pinnedPort)

    expect(await requestOverSocket(socket, '/api/v1/health')).toContain('HTTP/1.1 200')

    socket.destroy()
  })

  it('serves the API on the main port too, with the same certificate', async () => {
    const socket = await connectTls(mainPort)

    expect(socket.getPeerCertificate().subject.CN).toBe('cert-a.test.cardinalapps.host')
    expect(await requestOverSocket(socket, '/api/v1/health')).toContain('HTTP/1.1 200')

    socket.destroy()
  })

  it('rebinds the same port after a restart', async () => {
    await httpsService.stop()
    expect(httpsService.getStatus().state).toBe('stopped')

    await httpsService.maybeStart()

    expect(httpsService.getStatus()).toMatchObject({ state: 'running', port: pinnedPort })
  })

  it('stops answering on both ports when it stops', async () => {
    await httpsService.stop()

    await expect(connectTls(pinnedPort)).rejects.toBeDefined()
    await expect(connectTls(mainPort)).rejects.toBeDefined()

    await httpsService.maybeStart()
  })
})
