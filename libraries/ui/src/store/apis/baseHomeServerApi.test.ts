import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { BaseQueryApi } from '@reduxjs/toolkit/query'

import { globalActions } from '../constants/actions'

// Builds an unsigned JWT whose exp is `expiresInSeconds` from now
const makeJwt = (expiresInSeconds: number): string => {
  const encode = (obj: Record<string, unknown>) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'HS256', typ: 'JWT' }
  const payload = { uid: 'test-user', type: 'access', iat: now, exp: now + expiresInSeconds }

  return `${encode(header)}.${encode(payload)}.fakesignature`
}

// Builds a fetch Response with a JSON body
const jsonResponse = (status: number, body: Record<string, unknown>, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  })

// Builds the slice of the BaseQueryApi that fetchBaseQuery and the reauth wrapper actually use
const makeApi = (dispatch = vi.fn()) => ({
  signal: new AbortController().signal,
  abort: vi.fn(),
  dispatch,
  getState: () => ({ app: { app: 'music' } }),
  extra: undefined,
  endpoint: 'getTest',
  type: 'query',
  forced: false,
}) as unknown as BaseQueryApi

/*
 * The refresh provider registration lives in module state (homeServerAPI.ts), so every test gets
 * a fresh module registry: tests that register a provider can't leak it into tests that assert
 * the no-provider behavior.
 */
const loadModules = async () => {
  vi.resetModules()
  const { baseQueryWithReauth } = await import('./baseHomeServerApi')
  const { registerTokenRefreshProvider } = await import('../../lib/homeserver/homeServerAPI')
  const { setJWT, JWT_TYPE } = await import('../../lib/auth/jwt')
  return { baseQueryWithReauth, registerTokenRefreshProvider, setJWT, JWT_TYPE }
}

describe('baseQueryWithReauth', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends the stored token and returns data when the token is healthy', async () => {
    const { baseQueryWithReauth, setJWT, JWT_TYPE } = await loadModules()
    const token = makeJwt(900)
    setJWT(token, JWT_TYPE.HOME_SERVER_USER)

    const fetchMock = vi.fn<(request: Request) => Promise<Response>>(async () => jsonResponse(200, { tracks: [] }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await baseQueryWithReauth('/music/tracks', makeApi(), {})

    expect(result.data).toEqual({ tracks: [] })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0].headers.get('authorization')).toBe(`Bearer ${token}`)
  })

  it('proactively refreshes a token that is about to expire before sending the request', async () => {
    const { baseQueryWithReauth, registerTokenRefreshProvider, setJWT, JWT_TYPE } = await loadModules()
    setJWT(makeJwt(5), JWT_TYPE.HOME_SERVER_USER)

    const freshToken = makeJwt(900)
    const provider = vi.fn(async () => {
      setJWT(freshToken, JWT_TYPE.HOME_SERVER_USER)
      return freshToken
    })
    registerTokenRefreshProvider(provider)

    const fetchMock = vi.fn<(request: Request) => Promise<Response>>(async () => jsonResponse(200, { tracks: [] }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await baseQueryWithReauth('/music/tracks', makeApi(), {})

    expect(provider).toHaveBeenCalledTimes(1)
    expect(result.data).toEqual({ tracks: [] })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0].headers.get('authorization')).toBe(`Bearer ${freshToken}`)
  })

  it('refreshes and retries once when the server answers 401', async () => {
    const { baseQueryWithReauth, registerTokenRefreshProvider, setJWT, JWT_TYPE } = await loadModules()
    setJWT(makeJwt(900), JWT_TYPE.HOME_SERVER_USER)

    const freshToken = makeJwt(900)
    const provider = vi.fn(async () => {
      setJWT(freshToken, JWT_TYPE.HOME_SERVER_USER)
      return freshToken
    })
    registerTokenRefreshProvider(provider)

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(401, { message: 'Token expired', statusCode: 401 }))
      .mockResolvedValueOnce(jsonResponse(200, { tracks: ['a'] }))
    vi.stubGlobal('fetch', fetchMock)

    const dispatch = vi.fn()
    const result = await baseQueryWithReauth('/music/tracks', makeApi(dispatch), {})

    expect(provider).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const retryRequest = fetchMock.mock.calls[1][0] as unknown as Request
    expect(retryRequest.headers.get('authorization')).toBe(`Bearer ${freshToken}`)
    expect(result.data).toEqual({ tracks: ['a'] })
    expect(dispatch).not.toHaveBeenCalledWith({ type: globalActions.RESET })
  })

  it('logs the user out when the refresh itself fails', async () => {
    const { baseQueryWithReauth, registerTokenRefreshProvider, setJWT, JWT_TYPE } = await loadModules()
    setJWT(makeJwt(900), JWT_TYPE.HOME_SERVER_USER)

    const provider = vi.fn(async () => {
      throw new Error('Refresh token expired')
    })
    registerTokenRefreshProvider(provider)

    const fetchMock = vi.fn(async () => jsonResponse(401, { message: 'Token expired', statusCode: 401 }))
    vi.stubGlobal('fetch', fetchMock)

    const dispatch = vi.fn()
    const result = await baseQueryWithReauth('/music/tracks', makeApi(dispatch), {})

    expect(result.error).toMatchObject({ status: 401 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(dispatch).toHaveBeenCalledWith({ type: globalActions.RESET })
  })

  /* A cloud-linked account is its Cardinal account, so a refresh refused for want of a cloud
     tolkien ends the whole session, local half included. */
  it('ends both sessions when the refresh failed for want of a cloud token', async () => {
    const { baseQueryWithReauth, registerTokenRefreshProvider, setJWT, JWT_TYPE } = await loadModules()
    setJWT(makeJwt(900), JWT_TYPE.HOME_SERVER_USER)
    setJWT('cloud-token', JWT_TYPE.CLOUD_USER)

    const provider = vi.fn(async () => {
      // RTK serializes a thunk's rejection down to these fields, so the code is what survives
      throw { message: 'Cloud token required.', code: 'cloud_token_required' }
    })
    registerTokenRefreshProvider(provider)

    const fetchMock = vi.fn(async () => jsonResponse(401, { message: 'Unauthorized', statusCode: 401 }))
    vi.stubGlobal('fetch', fetchMock)

    const dispatch = vi.fn()
    const result = await baseQueryWithReauth('/music/tracks', makeApi(dispatch), {})

    expect(result.error).toMatchObject({ status: 401 })
    expect(dispatch).toHaveBeenCalledWith({ type: globalActions.RESET })
    expect(dispatch).toHaveBeenCalledWith({ type: 'cloudUser/logout/fulfilled' })
    expect(localStorage.getItem('@cardinal/home_server_user_tolkien')).toBeNull()
    expect(localStorage.getItem('@cardinal/cloud_user_tolkien')).toBeNull()
  })

  it('returns the 401 untouched when no refresh provider is registered', async () => {
    const { baseQueryWithReauth, setJWT, JWT_TYPE } = await loadModules()
    setJWT(makeJwt(900), JWT_TYPE.HOME_SERVER_USER)

    const fetchMock = vi.fn(async () => jsonResponse(401, { message: 'Token expired', statusCode: 401 }))
    vi.stubGlobal('fetch', fetchMock)

    const dispatch = vi.fn()
    const result = await baseQueryWithReauth('/music/tracks', makeApi(dispatch), {})

    expect(result.error).toMatchObject({ status: 401 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(dispatch).not.toHaveBeenCalledWith({ type: globalActions.RESET })
  })

  it('resets the app when the server answers 410 for a gone user', async () => {
    const { baseQueryWithReauth, setJWT, JWT_TYPE } = await loadModules()
    setJWT(makeJwt(900), JWT_TYPE.HOME_SERVER_USER)

    const fetchMock = vi.fn(async () => jsonResponse(410, { message: 'Gone', statusCode: 410 }))
    vi.stubGlobal('fetch', fetchMock)

    const dispatch = vi.fn()
    const result = await baseQueryWithReauth('/music/tracks', makeApi(dispatch), {})

    expect(result.error).toMatchObject({ status: 410 })
    expect(dispatch).toHaveBeenCalledWith({ type: globalActions.RESET })
    expect(localStorage.getItem('@cardinal/home_server_user_tolkien')).toBeNull()
  })

  it('shares one refresh between concurrent 401s', async () => {
    const { baseQueryWithReauth, registerTokenRefreshProvider, setJWT, JWT_TYPE } = await loadModules()
    setJWT(makeJwt(900), JWT_TYPE.HOME_SERVER_USER)

    const freshToken = makeJwt(900)
    const provider = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
      setJWT(freshToken, JWT_TYPE.HOME_SERVER_USER)
      return freshToken
    })
    registerTokenRefreshProvider(provider)

    let calls = 0
    const fetchMock = vi.fn(async () => {
      calls += 1
      return calls <= 2
        ? jsonResponse(401, { message: 'Token expired', statusCode: 401 })
        : jsonResponse(200, { ok: true })
    })
    vi.stubGlobal('fetch', fetchMock)

    const [resultA, resultB] = await Promise.all([
      baseQueryWithReauth('/music/tracks', makeApi(), {}),
      baseQueryWithReauth('/music/releases', makeApi(), {}),
    ])

    expect(provider).toHaveBeenCalledTimes(1)
    expect(resultA.data).toEqual({ ok: true })
    expect(resultB.data).toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(4)
  })
})
