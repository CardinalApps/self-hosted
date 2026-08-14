import { negotiateConnection } from '../src/negotiate'
import { MatchmakerUnavailableError, ServerNotFoundError } from '../src/errors'
import { ConnectionInfo } from '../src/types'

const MATCHMAKER = 'https://api.example.test'
const INSTANCE = 'itest-instance-1'

// A fetch stub that returns the given status and body for any URL
function fetchReturning(status: number, body?: unknown): typeof fetch {
  return jest.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      if (body === undefined) {
        throw new Error('no body')
      }
      return body
    },
  })) as unknown as typeof fetch
}

function online(overrides: Partial<ConnectionInfo> = {}): ConnectionInfo {
  return {
    online: true,
    candidates: [],
    relay: { url: `https://relay.example.test/relay/${INSTANCE}`, enabled: true },
    ...overrides,
  }
}

describe('negotiateConnection', () => {
  it('returns the candidates in order with the relay fallback', async () => {
    const info = online({
      candidates: [
        { kind: 'lan', hostname: `192-168-1-40.${INSTANCE}.connect.test`, port: 3443 },
        { kind: 'wan', hostname: `${INSTANCE}.connect.test`, port: 24900 },
      ],
    })

    const plan = await negotiateConnection(MATCHMAKER, INSTANCE, fetchReturning(200, info))

    expect(plan).toEqual({
      kind: 'direct',
      url: `https://192-168-1-40.${INSTANCE}.connect.test:3443`,
      candidates: [
        expect.objectContaining({ kind: 'lan', url: `https://192-168-1-40.${INSTANCE}.connect.test:3443` }),
        expect.objectContaining({ kind: 'wan', url: `https://${INSTANCE}.connect.test:24900` }),
      ],
      fallbackRelayUrl: `https://relay.example.test/relay/${INSTANCE}`,
    })
  })

  it('folds a legacy direct-only response into a lone wan candidate', async () => {
    const info = online({ direct: { hostname: `${INSTANCE}.connect.test`, port: 24900 } })

    const plan = await negotiateConnection(MATCHMAKER, INSTANCE, fetchReturning(200, info))

    expect(plan).toMatchObject({
      kind: 'direct',
      url: `https://${INSTANCE}.connect.test:24900`,
      candidates: [{ kind: 'wan', hostname: `${INSTANCE}.connect.test`, port: 24900 }],
    })
  })

  it('omits the port at 443', async () => {
    const info = online({ candidates: [{ kind: 'wan', hostname: `${INSTANCE}.connect.test`, port: 443 }] })

    const plan = await negotiateConnection(MATCHMAKER, INSTANCE, fetchReturning(200, info))

    expect(plan).toMatchObject({ url: `https://${INSTANCE}.connect.test` })
  })

  it('leaves the relay fallback empty when the relay path is off', async () => {
    const info = online({
      candidates: [{ kind: 'wan', hostname: `${INSTANCE}.connect.test`, port: 24900 }],
      relay: { url: '', enabled: false },
    })

    const plan = await negotiateConnection(MATCHMAKER, INSTANCE, fetchReturning(200, info))

    expect(plan).toMatchObject({ kind: 'direct', fallbackRelayUrl: null })
  })

  it('falls back to the relay when there is no direct path', async () => {
    const plan = await negotiateConnection(MATCHMAKER, INSTANCE, fetchReturning(200, online()))

    expect(plan).toEqual({ kind: 'relay', url: `https://relay.example.test/relay/${INSTANCE}` })
  })

  it('reports offline when the server is offline', async () => {
    const plan = await negotiateConnection(MATCHMAKER, INSTANCE, fetchReturning(200, online({ online: false })))

    expect(plan).toEqual({ kind: 'offline' })
  })

  it('reports offline when every path is unavailable', async () => {
    const info = online({ relay: { url: '', enabled: false } })

    const plan = await negotiateConnection(MATCHMAKER, INSTANCE, fetchReturning(200, info))

    expect(plan).toEqual({ kind: 'offline' })
  })

  it('throws ServerNotFoundError on a 404', async () => {
    await expect(negotiateConnection(MATCHMAKER, INSTANCE, fetchReturning(404)))
      .rejects.toBeInstanceOf(ServerNotFoundError)
  })

  it('throws MatchmakerUnavailableError on a 5xx', async () => {
    await expect(negotiateConnection(MATCHMAKER, INSTANCE, fetchReturning(500)))
      .rejects.toBeInstanceOf(MatchmakerUnavailableError)
  })

  it('throws MatchmakerUnavailableError on a network error', async () => {
    const failingFetch = jest.fn(async () => {
      throw new Error('ECONNREFUSED')
    }) as unknown as typeof fetch

    await expect(negotiateConnection(MATCHMAKER, INSTANCE, failingFetch))
      .rejects.toBeInstanceOf(MatchmakerUnavailableError)
  })

  it('throws MatchmakerUnavailableError on a non-JSON body', async () => {
    await expect(negotiateConnection(MATCHMAKER, INSTANCE, fetchReturning(200)))
      .rejects.toBeInstanceOf(MatchmakerUnavailableError)
  })
})
