import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { getBearerToken, resetBearerTokenProvider } from '@cardinalapps/topology/src/bearerToken'
import { fetchRemoteAccessAPI } from '@cardinalapps/topology/src/remote-access/edge/fetchRemoteAccessAPI'
import { fetchPopularityAPI } from '@cardinalapps/topology/src/popularity/edge/fetchPopularityAPI'
import { fetchFeedbackAPI } from '@cardinalapps/topology/src/feedback/edge/fetchFeedbackAPI'

import { cloudBearerTokenProvider, registerCloudBearerTokenProvider } from './cloudBearerToken'
import { registerCloudTokenRefreshProvider } from './authAPI'
import { CLOUD_USER_JWT_LOCALSTORAGE_KEY } from './jwt'

const base64url = (value: object) =>
  btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_')

// A syntactically valid JWT whose payload expires in `secondsUntilExpiry`
const makeJwt = (secondsUntilExpiry: number) => [
  base64url({ alg: 'HS256', typ: 'JWT' }),
  base64url({ exp: Math.floor(Date.now() / 1000) + secondsUntilExpiry }),
  'signature',
].join('.')

// Installs a refresh that swaps in a long-lived token, and counts how often it ran
const countingRefresh = (freshToken: string, delayMs = 0) => {
  const calls = { count: 0 }

  registerCloudTokenRefreshProvider(async () => {
    calls.count++
    if (delayMs) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
    localStorage.setItem(CLOUD_USER_JWT_LOCALSTORAGE_KEY, freshToken)
    return freshToken
  })

  return calls
}

const authorizationOf = (call: unknown[]) =>
  ((call[1] as RequestInit).headers as Record<string, string>).Authorization

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  resetBearerTokenProvider()
  vi.unstubAllGlobals()
})

describe('cloudBearerTokenProvider', () => {
  it('passes a fresh token through without refreshing', async () => {
    const token = makeJwt(900)
    localStorage.setItem(CLOUD_USER_JWT_LOCALSTORAGE_KEY, token)
    const refresh = countingRefresh(makeJwt(900))

    await expect(cloudBearerTokenProvider()).resolves.toBe(token)
    expect(refresh.count).toBe(0)
  })

  it('refreshes first when the stored token is about to expire', async () => {
    localStorage.setItem(CLOUD_USER_JWT_LOCALSTORAGE_KEY, makeJwt(10))
    const fresh = makeJwt(900)
    const refresh = countingRefresh(fresh)

    await expect(cloudBearerTokenProvider()).resolves.toBe(fresh)
    expect(refresh.count).toBe(1)
  })

  it('resolves null when the user holds no cloud token', async () => {
    const refresh = countingRefresh(makeJwt(900))

    await expect(cloudBearerTokenProvider()).resolves.toBeNull()
    expect(refresh.count).toBe(0)
  })

  it('falls back to the stale token when the refresh fails', async () => {
    const stale = makeJwt(10)
    localStorage.setItem(CLOUD_USER_JWT_LOCALSTORAGE_KEY, stale)
    registerCloudTokenRefreshProvider(async () => {
      throw new Error('offline')
    })

    await expect(cloudBearerTokenProvider()).resolves.toBe(stale)
  })
})

describe('registerCloudBearerTokenProvider', () => {
  it('hands the provider to the topology edge fetchers', async () => {
    const token = makeJwt(900)
    localStorage.setItem(CLOUD_USER_JWT_LOCALSTORAGE_KEY, token)
    registerCloudBearerTokenProvider()

    await expect(getBearerToken()).resolves.toBe(token)
  })

  it('shares one refresh across concurrent edge fetcher calls', async () => {
    localStorage.setItem(CLOUD_USER_JWT_LOCALSTORAGE_KEY, makeJwt(10))
    const fresh = makeJwt(900)
    // The real refresh is a network round trip, so concurrent callers overlap
    const refresh = countingRefresh(fresh, 10)
    registerCloudBearerTokenProvider()

    const fetchMock = vi.fn(async () =>
      new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await Promise.all([
      fetchRemoteAccessAPI('/admin/servers', 'GET', 'prod', { accessToken: true }),
      fetchPopularityAPI('/api/stats', 'GET', 'prod', { accessToken: true }),
      fetchFeedbackAPI('/query', 'GET', 'prod', { accessToken: true }),
    ])

    expect(refresh.count).toBe(1)
    expect(fetchMock.mock.calls).toHaveLength(3)
    for (const call of fetchMock.mock.calls) {
      expect(authorizationOf(call)).toBe(`Bearer ${fresh}`)
    }
  })
})
