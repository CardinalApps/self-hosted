import * as fs from 'fs'
import * as path from 'path'
import * as tls from 'tls'

import { createTestApp, destroyTestApp, TestApp } from '../../../helpers/create-app'
import { HttpsService } from '../../../../src/modules/remote-access/https/https.service'
import { ConnectSDKEvents } from '../../../../src/modules/remote-access/connect/connect-sdk.events'
import { DatabaseService } from '../../../../src/modules/database/database.service'
import { OPTIONS } from '../../../../src/utils/options'

const FIXTURES = path.join(__dirname, '..', '..', '..', 'fixtures', 'certs')
const CERT_A = fs.readFileSync(path.join(FIXTURES, 'cert-a.pem'), 'utf8')
const KEY_A = fs.readFileSync(path.join(FIXTURES, 'key-a.pem'), 'utf8')
const CERT_B = fs.readFileSync(path.join(FIXTURES, 'cert-b.pem'), 'utf8')
const KEY_B = fs.readFileSync(path.join(FIXTURES, 'key-b.pem'), 'utf8')

let testApp: TestApp
let httpsService: HttpsService
let port: number

function connectTls(): Promise<tls.TLSSocket> {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({ host: '127.0.0.1', port, rejectUnauthorized: false }, () => resolve(socket))
    socket.once('error', reject)
  })
}

// Sends a raw HTTP request over an established TLS socket and returns the
// response head
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

beforeAll(async () => {
  testApp = await createTestApp()

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

  expect(httpsService.getStatus().state).toBe('running')
  port = httpsService.getStatus().port
}, 90000)

afterAll(async () => {
  await destroyTestApp(testApp)
})

describe('Remote Access HTTPS listener', () => {
  it('serves the API with the stored cert on an OS-assigned port', async () => {
    const socket = await connectTls()

    expect(socket.getPeerCertificate().subject.CN).toBe('cert-a.test.cardinalapps.host')

    const response = await requestOverSocket(socket, '/api/v1/health')
    expect(response).toContain('HTTP/1.1 200')

    socket.destroy()
  })

  it('presents the new cert to new handshakes after a cert:update push', async () => {
    // Held open across the rotation
    const existingSocket = await connectTls()
    expect(existingSocket.getPeerCertificate().subject.CN).toBe('cert-a.test.cardinalapps.host')

    const events = testApp.moduleRef.get(ConnectSDKEvents)
    events.emit('cert:update', { cert_pem: CERT_B, key_pem: KEY_B })
    await new Promise((resolve) => setTimeout(resolve, 100))

    const freshSocket = await connectTls()
    expect(freshSocket.getPeerCertificate().subject.CN).toBe('cert-b.test.cardinalapps.host')

    // The pre-rotation connection survives and still serves requests
    const response = await requestOverSocket(existingSocket, '/api/v1/health')
    expect(response).toContain('HTTP/1.1 200')

    existingSocket.destroy()
    freshSocket.destroy()
  })
})
