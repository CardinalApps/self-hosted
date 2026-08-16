import * as fs from 'fs'
import * as http from 'http'
import * as https from 'https'
import * as path from 'path'
import * as tls from 'tls'
import { WebSocket, WebSocketServer } from 'ws'

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
let wss: WebSocketServer
let port: number

// Fetches over plain HTTP on the main port
function getOverHttp(urlPath: string): Promise<{ status: number, body: string }> {
  return new Promise((resolve, reject) => {
    const request = http.get({ host: '127.0.0.1', port, path: urlPath }, (response) => {
      let body = ''
      response.on('data', (chunk) => { body += chunk })
      response.on('end', () => resolve({ status: response.statusCode!, body }))
    })
    request.once('error', reject)
  })
}

// Fetches over TLS on the same main port
function getOverTls(urlPath: string): Promise<{ status: number, body: string }> {
  return new Promise((resolve, reject) => {
    const request = https.get({
      host: '127.0.0.1',
      port,
      path: urlPath,
      rejectUnauthorized: false,
      servername: 'cert-a.test.cardinalapps.host',
    }, (response) => {
      let body = ''
      response.on('data', (chunk) => { body += chunk })
      response.on('end', () => resolve({ status: response.statusCode!, body }))
    })
    request.once('error', reject)
  })
}

function connectTls(): Promise<tls.TLSSocket> {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({ host: '127.0.0.1', port, rejectUnauthorized: false }, () => resolve(socket))
    socket.once('error', reject)
  })
}

// Opens a WebSocket against the echo server attached to the app's HTTP server
function echoOverWebSocket(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = new WebSocket(url, { rejectUnauthorized: false })
    client.once('message', (data) => {
      client.close()
      resolve(data.toString())
    })
    client.once('error', reject)
    client.once('open', () => client.send('ping'))
  })
}

async function waitForTls(): Promise<void> {
  const startTime = Date.now()
  while (httpsService.getStatus().state !== 'running' && Date.now() - startTime < 5000) {
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
}

beforeAll(async () => {
  testApp = await createTestApp()

  /* Stands in for the app's own WebSocket handling, which registers on the HTTP server the same
     way. What is under test is whether an upgrade survives the trip through the mux. */
  wss = new WebSocketServer({ server: testApp.app.getHttpServer(), path: '/mux-echo' })
  wss.on('connection', (socket) => socket.on('message', (data) => socket.send(data.toString())))

  muxService = testApp.moduleRef.get(MuxService)
  port = await muxService.listen(0, testApp.app.getHttpServer(), '127.0.0.1')

  httpsService = testApp.moduleRef.get(HttpsService)
  httpsService.attach(testApp.app.getHttpAdapter().getInstance())
}, 90000)

afterAll(async () => {
  await new Promise((resolve) => wss.close(resolve))
  await destroyTestApp(testApp)
})

describe('before Remote Access has any certificate', () => {
  it('serves the API over plain HTTP', async () => {
    expect((await getOverHttp('/api/v1/health')).status).toBe(200)
  })

  it('is not answering TLS', () => {
    expect(muxService.isTlsActive()).toBe(false)
    expect(httpsService.getStatus().state).toBe('stopped')
  })

  // Nothing can be said in TLS that an HTTP-only listener could answer, so the socket is dropped
  it('closes TLS connections instead of leaving them hanging', async () => {
    await expect(connectTls()).rejects.toBeDefined()
  })
})

describe('once Remote Access has cert material', () => {
  beforeAll(async () => {
    const databaseService = testApp.moduleRef.get(DatabaseService)
    await databaseService.saveOption(OPTIONS.CONNECT_ENABLED.name, 'true')
    await databaseService.saveOption(OPTIONS.CONNECT_TLS_CERT_PEM.name, CERT_A)
    await databaseService.saveOption(OPTIONS.CONNECT_TLS_KEY_PEM.name, KEY_A)

    await httpsService.maybeStart()
    await waitForTls()
  })

  it('reports the main port as the one serving TLS', () => {
    expect(httpsService.getStatus()).toMatchObject({ state: 'running', port })
    expect(muxService.isTlsActive()).toBe(true)
  })

  it('serves the API over TLS on the same port', async () => {
    const response = await getOverTls('/api/v1/health')

    expect(response.status).toBe(200)
  })

  it('presents the stored Remote Access certificate', async () => {
    const socket = await connectTls()

    expect(socket.getPeerCertificate().subject.CN).toBe('cert-a.test.cardinalapps.host')

    socket.destroy()
  })

  it('still serves plain HTTP on that port', async () => {
    expect((await getOverHttp('/api/v1/health')).status).toBe(200)
  })

  it('serves both protocols over connections held open at the same time', async () => {
    const tlsSocket = await connectTls()

    const [plain, secure] = await Promise.all([getOverHttp('/api/v1/health'), getOverTls('/api/v1/health')])

    expect(plain.status).toBe(200)
    expect(secure.status).toBe(200)
    expect(tlsSocket.getPeerCertificate().subject.CN).toBe('cert-a.test.cardinalapps.host')

    tlsSocket.destroy()
  })

  it('upgrades a WebSocket over the plain half', async () => {
    expect(await echoOverWebSocket(`ws://127.0.0.1:${port}/mux-echo`)).toBe('ping')
  })

  it('upgrades a WebSocket over the TLS half', async () => {
    expect(await echoOverWebSocket(`wss://127.0.0.1:${port}/mux-echo`)).toBe('ping')
  })
})

describe('when Remote Access is turned off again', () => {
  beforeAll(async () => {
    await httpsService.stop()
  })

  it('goes back to closing TLS connections', async () => {
    expect(muxService.isTlsActive()).toBe(false)
    await expect(connectTls()).rejects.toBeDefined()
  })

  it('leaves plain HTTP untouched', async () => {
    expect((await getOverHttp('/api/v1/health')).status).toBe(200)
  })
})
