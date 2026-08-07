import * as http from 'http'
import { AddressInfo } from 'net'
import { WebSocket, WebSocketServer } from 'ws'

import { createTestApp, TestApp } from '../../helpers/create-app'
import { ConnectSDKService } from '../../../src/modules/connect-sdk/connect-sdk.service'
import { TokenRefresher } from '../../../src/modules/connect-sdk/token-refresher'
import { DatabaseService } from '../../../src/modules/database/database.service'
import { OPTIONS } from '../../../src/utils/options'

// Builds an unsigned-but-decodable JWT with the given time until expiry
function makeJwt(expiresInMs: number): string {
  const b64 = (obj: Record<string, unknown>) => Buffer.from(JSON.stringify(obj)).toString('base64url')
  const exp = Math.floor((Date.now() + expiresInMs) / 1000)
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 'user-1', exp })}.fakesig`
}

// Polls until the probe returns truthy, or times out
async function waitFor<T>(probe: () => T | Promise<T>, timeoutMs = 10_000): Promise<T> {
  const startedAt = Date.now()
  for (;;) {
    const value = await probe()
    if (value) {
      return value
    }
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error('Timed out waiting for condition')
    }
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
}

type ReceivedConnection = {
  socket: WebSocket,
  token: string | null,
  messages: Record<string, unknown>[],
}

describe('ConnectSDK (integration)', () => {
  let testApp: TestApp
  let service: ConnectSDKService
  let databaseService: DatabaseService

  // Stub Remote Access Server
  let wssHttp: http.Server
  let wss: WebSocketServer
  const connections: ReceivedConnection[] = []

  beforeAll(async () => {
    wssHttp = http.createServer()
    wss = new WebSocketServer({ server: wssHttp, path: '/connect' })
    wss.on('connection', (socket, request) => {
      const url = new URL(request.url!, 'http://localhost')
      const connection: ReceivedConnection = { socket, token: url.searchParams.get('token'), messages: [] }
      connections.push(connection)
      socket.on('message', (data) => {
        connection.messages.push(JSON.parse(data.toString()))
      })
    })
    await new Promise<void>((resolve) => wssHttp.listen(0, '127.0.0.1', resolve))
    const wssPort = (wssHttp.address() as AddressInfo).port

    // eslint-disable-next-line turbo/no-undeclared-env-vars
    process.env.CONNECT_HOST = `127.0.0.1:${wssPort}`

    testApp = await createTestApp()
    service = testApp.moduleRef.get(ConnectSDKService)
    databaseService = testApp.moduleRef.get(DatabaseService)

    /*
     * The HTTP refresh flow against the cloud IDP is covered by unit tests;
     * here the dev machine may be running a real auth server on the dev port,
     * so token minting is stubbed to keep this suite about the WSS protocol.
     */
    const tokenRefresher = testApp.moduleRef.get(TokenRefresher)
    jest.spyOn(tokenRefresher, 'getCurrentToken').mockResolvedValue(makeJwt(15 * 60 * 1000))

    await databaseService.saveOption(OPTIONS.INSTANCE_ID.name, 'itest-instance-1')
    await databaseService.saveOption(OPTIONS.CONNECT_SERVER_TOKEN.name, makeJwt(1000 * 60 * 60 * 24 * 365))
    await databaseService.saveOption(OPTIONS.CONNECT_ENABLED.name, 'true')
  })

  afterAll(async () => {
    await service?.disconnect()
    await testApp?.app.close()
    await new Promise((resolve) => wss.close(resolve))
    await new Promise((resolve) => wssHttp.close(resolve))
  })

  it('connects, registers, and persists the registered payload', async () => {
    await service.connect()

    const connection = await waitFor(() => connections[0])
    expect(connection.token).toBeTruthy()

    const register = await waitFor(() => connection.messages.find((m) => m.type === 'register'))
    expect(register.instanceId).toBe('itest-instance-1')
    expect(typeof register.publicPort).toBe('number')
    expect(register.version).toBeTruthy()

    connection.socket.send(JSON.stringify({
      type: 'registered',
      publicIp: '203.0.113.9',
      hostname: 'itest-instance-1.connect.cardinalapps.host',
      signingKey: Buffer.alloc(32, 9).toString('base64'),
      config: {},
    }))

    await waitFor(async () => await databaseService.getOption(OPTIONS.CONNECT_HOSTNAME.name))

    expect(await databaseService.getOption(OPTIONS.CONNECT_HOSTNAME.name)).toBe('itest-instance-1.connect.cardinalapps.host')
    expect(await databaseService.getOption(OPTIONS.CONNECT_SIGNING_KEY.name)).toBe(Buffer.alloc(32, 9).toString('base64'))
    expect((await service.getStatus()).state).toBe('connected')
  })

  it('reconnects and re-registers after the server drops the connection', async () => {
    connections[0].socket.terminate()

    const reconnection = await waitFor(() => connections[1])
    const register = await waitFor(() => reconnection.messages.find((m) => m.type === 'register'))

    expect(register.instanceId).toBe('itest-instance-1')
  })

  it('applies a rotated signing key pushed via config:update', async () => {
    const connection = await waitFor(() => connections[1])
    const rotatedKey = Buffer.alloc(32, 4).toString('base64')

    connection.socket.send(JSON.stringify({ type: 'config:update', signingKey: rotatedKey }))

    await waitFor(async () => (await databaseService.getOption(OPTIONS.CONNECT_SIGNING_KEY.name)) === rotatedKey)
  })
})
