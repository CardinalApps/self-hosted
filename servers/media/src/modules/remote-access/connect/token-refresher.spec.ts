import { TokenRefresher, ConnectAuthError } from './token-refresher'
import { DatabaseService } from '../../database/database.service'
import { OPTIONS } from '../../../utils/options'

jest.mock('@cardinalapps/topology/dist/cjs', () => ({
  ...jest.requireActual('@cardinalapps/topology/dist/cjs'),
  fetchAuthAPI: jest.fn(),
}))

import { fetchAuthAPI } from '@cardinalapps/topology/dist/cjs'

const mockedFetchAuthAPI = fetchAuthAPI as jest.Mock

// Builds an unsigned-but-decodable JWT with the given time until expiry
function makeJwt(expiresInMs: number): string {
  const b64 = (obj: Record<string, unknown>) => Buffer.from(JSON.stringify(obj)).toString('base64url')
  const exp = Math.floor((Date.now() + expiresInMs) / 1000)
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 'user-1', exp })}.fakesig`
}

function makeDb(options: Record<string, string> = {}) {
  return {
    getOption: jest.fn(async (name: string) => options[name]),
    saveOption: jest.fn(async () => ({})),
  }
}

function okResponse(jwt: string) {
  return { status: 200, json: async () => ({ JWT: jwt }) }
}

afterEach(() => {
  jest.resetAllMocks()
})

describe('TokenRefresher', () => {
  it('throws ConnectAuthError when no server token is stored', async () => {
    const refresher = new TokenRefresher(makeDb() as unknown as DatabaseService)

    await expect(refresher.getCurrentToken()).rejects.toBeInstanceOf(ConnectAuthError)
    expect(mockedFetchAuthAPI).not.toHaveBeenCalled()
  })

  it('exchanges the stored server token for an access token', async () => {
    const serverToken = makeJwt(1000 * 60 * 60 * 24 * 300)
    const accessToken = makeJwt(1000 * 60 * 15)
    const db = makeDb({ [OPTIONS.CONNECT_SERVER_TOKEN.name]: serverToken })
    mockedFetchAuthAPI.mockResolvedValue(okResponse(accessToken))

    const refresher = new TokenRefresher(db as unknown as DatabaseService)

    await expect(refresher.getCurrentToken()).resolves.toBe(accessToken)
    expect(mockedFetchAuthAPI).toHaveBeenCalledWith(
      '/auth/server-refresh',
      'POST',
      expect.anything(),
      expect.objectContaining({ body: { token: serverToken }, returnRawResponse: true }),
    )
  })

  it('returns the cached access token while it has more than 10 minutes left', async () => {
    const db = makeDb({ [OPTIONS.CONNECT_SERVER_TOKEN.name]: makeJwt(1000000000) })
    mockedFetchAuthAPI.mockResolvedValue(okResponse(makeJwt(1000 * 60 * 20)))

    const refresher = new TokenRefresher(db as unknown as DatabaseService)
    await refresher.getCurrentToken()
    await refresher.getCurrentToken()

    expect(mockedFetchAuthAPI).toHaveBeenCalledTimes(1)
  })

  it('refreshes when the cached access token has less than 10 minutes left', async () => {
    const db = makeDb({ [OPTIONS.CONNECT_SERVER_TOKEN.name]: makeJwt(1000000000) })
    mockedFetchAuthAPI.mockResolvedValueOnce(okResponse(makeJwt(1000 * 60 * 5)))
    mockedFetchAuthAPI.mockResolvedValueOnce(okResponse(makeJwt(1000 * 60 * 20)))

    const refresher = new TokenRefresher(db as unknown as DatabaseService)
    await refresher.getCurrentToken()
    const second = await refresher.getCurrentToken()

    expect(mockedFetchAuthAPI).toHaveBeenCalledTimes(2)
    expect(second).not.toBe(undefined)
  })

  it('throws ConnectAuthError when the auth server rejects the server token', async () => {
    const db = makeDb({ [OPTIONS.CONNECT_SERVER_TOKEN.name]: makeJwt(1000000000) })
    mockedFetchAuthAPI.mockResolvedValue({ status: 401, json: async () => ({ message: 'Invalid or expired server token.' }) })

    const refresher = new TokenRefresher(db as unknown as DatabaseService)

    await expect(refresher.getCurrentToken()).rejects.toBeInstanceOf(ConnectAuthError)
  })

  it('throws a plain error on auth server 5xx (transient — must not disable)', async () => {
    const db = makeDb({ [OPTIONS.CONNECT_SERVER_TOKEN.name]: makeJwt(1000000000) })
    mockedFetchAuthAPI.mockResolvedValue({ status: 500, json: async () => ({}) })

    const refresher = new TokenRefresher(db as unknown as DatabaseService)
    const err = await refresher.getCurrentToken().catch((e) => e)

    expect(err).toBeInstanceOf(Error)
    expect(err).not.toBeInstanceOf(ConnectAuthError)
  })

  it('throws a plain error when the cloud is unreachable (transient — must not disable)', async () => {
    const db = makeDb({ [OPTIONS.CONNECT_SERVER_TOKEN.name]: makeJwt(1000000000) })
    mockedFetchAuthAPI.mockRejectedValue(new TypeError('fetch failed'))

    const refresher = new TokenRefresher(db as unknown as DatabaseService)
    const err = await refresher.getCurrentToken().catch((e) => e)

    expect(err).toBeInstanceOf(Error)
    expect(err).not.toBeInstanceOf(ConnectAuthError)
  })

  it('reports the stored server token expiry', async () => {
    const serverToken = makeJwt(1000 * 60 * 60)
    const db = makeDb({ [OPTIONS.CONNECT_SERVER_TOKEN.name]: serverToken })

    const refresher = new TokenRefresher(db as unknown as DatabaseService)
    const expiry = await refresher.getServerTokenExpiry()

    expect(expiry).toBeInstanceOf(Date)
    expect(expiry!.getTime()).toBeGreaterThan(Date.now())
    expect(expiry!.getTime()).toBeLessThanOrEqual(Date.now() + 1000 * 60 * 60)
  })

  it('returns null expiry when no server token is stored', async () => {
    const refresher = new TokenRefresher(makeDb() as unknown as DatabaseService)

    await expect(refresher.getServerTokenExpiry()).resolves.toBeNull()
  })
})
