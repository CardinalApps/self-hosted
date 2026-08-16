import * as http from 'http'
import { AddressInfo } from 'net'
import { WebSocket, WebSocketServer } from 'ws'
import { WSS_CLOSE_BANNED } from '@cardinalapps/remote-access/dist/cjs'

import { createTestApp, TestApp } from '../../../helpers/create-app'
import { ConnectSDKService, SLOW_RETRY_MS } from '../../../../src/modules/remote-access/connect/connect-sdk.service'
import { TokenRefresher } from '../../../../src/modules/remote-access/connect/token-refresher'
import { DatabaseService } from '../../../../src/modules/database/database.service'
import { OPTIONS } from '../../../../src/utils/options'

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

// Nothing binds it here; the listener is only started by the specs that attach it
const PINNED_HTTPS_PORT = 8443

describe('ConnectSDK (integration)', () => {
  let testApp: TestApp
  let service: ConnectSDKService
  let databaseService: DatabaseService

  // Stub Remote Access Server
  let wssHttp: http.Server
  let wss: WebSocketServer
  const connections: ReceivedConnection[] = []
  // When set, the stub turns every arriving connection away with this close code
  let refuseWithCode: number | null = null

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

      if (refuseWithCode) {
        socket.close(refuseWithCode)
      }
    })
    await new Promise<void>((resolve) => wssHttp.listen(0, '127.0.0.1', resolve))
    const wssPort = (wssHttp.address() as AddressInfo).port

    // eslint-disable-next-line turbo/no-undeclared-env-vars
    process.env.CONNECT_HOST = `127.0.0.1:${wssPort}`
    // eslint-disable-next-line turbo/no-undeclared-env-vars
    process.env.CONNECT_HTTPS_PORT = String(PINNED_HTTPS_PORT)

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
    delete process.env.CONNECT_HTTPS_PORT
    ConnectSDKService.slowRetryMs = SLOW_RETRY_MS
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
    expect(register.publicPort).toBe(PINNED_HTTPS_PORT)
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
    expect(register.publicPort).toBe(PINNED_HTTPS_PORT)
  })

  it('applies a rotated signing key pushed via config:update', async () => {
    const connection = await waitFor(() => connections[1])
    const rotatedKey = Buffer.alloc(32, 4).toString('base64')

    connection.socket.send(JSON.stringify({ type: 'config:update', signingKey: rotatedKey }))

    await waitFor(async () => (await databaseService.getOption(OPTIONS.CONNECT_SIGNING_KEY.name)) === rotatedKey)
  })

  /* Nothing is pinned in the published quick start, and the main port is the one serving TLS, so
     that is the port the Remote Access Server has to be told about. */
  it('advertises the main server port when nothing is pinned', async () => {
    delete process.env.CONNECT_HTTPS_PORT
    // eslint-disable-next-line turbo/no-undeclared-env-vars
    process.env.CARDINAL_HOME_SERVER_PORT = '24900'
    const registeredFrom = connections.length

    connections[connections.length - 1].socket.terminate()

    const reconnection = await waitFor(() => connections[registeredFrom])
    const register = await waitFor(() => reconnection.messages.find((m) => m.type === 'register'))

    expect(register.publicPort).toBe(24900)

    delete process.env.CARDINAL_HOME_SERVER_PORT
    // eslint-disable-next-line turbo/no-undeclared-env-vars
    process.env.CONNECT_HTTPS_PORT = String(PINNED_HTTPS_PORT)
  })

  /* A suspension is lifted by staff, not by the server owner, so the server has to find its own
     way back without anyone touching the Admin app. */
  it('waits out a 4005 suspension and reconnects once the server stops refusing', async () => {
    ConnectSDKService.slowRetryMs = 250
    refuseWithCode = WSS_CLOSE_BANNED
    const refusedFrom = connections.length

    connections[connections.length - 1].socket.close(WSS_CLOSE_BANNED)

    await waitFor(async () => (await service.getStatus()).state === 'suspended')

    // The retries keep coming while the suspension stands, and keep being turned away
    await waitFor(() => connections.length > refusedFrom + 1)
    expect((await service.getStatus()).state).toBe('suspended')

    refuseWithCode = null
    const recovered = await waitFor(() => connections
      .slice(refusedFrom)
      .find((connection) => connection.messages.some((message) => message.type === 'register')))

    recovered.socket.send(JSON.stringify({
      type: 'registered',
      publicIp: '203.0.113.9',
      hostname: 'itest-instance-1.connect.cardinalapps.host',
      signingKey: Buffer.alloc(32, 9).toString('base64'),
      config: { relayHostname: 'relay.itest.internal' },
    }))

    await waitFor(async () => (await service.getStatus()).state === 'connected')
    expect((await service.getStatus()).relayUrl).toBe('https://relay.itest.internal/relay/itest-instance-1')
  })
})
