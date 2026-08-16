import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import authAPI, { registerCloudTokenRefreshProvider } from './authAPI'
import { CLOUD_USER_JWT_LOCALSTORAGE_KEY } from './jwt'

const base64url = (value: object) =>
  btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_')

// A syntactically valid JWT whose payload expires in `secondsUntilExpiry`
const makeJwt = (secondsUntilExpiry: number) => [
  base64url({ alg: 'HS256', typ: 'JWT' }),
  base64url({ exp: Math.floor(Date.now() / 1000) + secondsUntilExpiry }),
  'signature',
].join('.')

const okResponse = () =>
  new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('authAPI proactive cloud token refresh', () => {
  it('shares one in-flight refresh across concurrent requests', async () => {
    // A token inside the 60s proactive-refresh window, so every call wants a refresh
    localStorage.setItem(CLOUD_USER_JWT_LOCALSTORAGE_KEY, makeJwt(10))

    let refreshCalls = 0

    registerCloudTokenRefreshProvider(async () => {
      refreshCalls++
      // The real provider is a network round trip, so concurrent callers overlap
      await new Promise((resolve) => setTimeout(resolve, 10))
      const fresh = makeJwt(900)
      localStorage.setItem(CLOUD_USER_JWT_LOCALSTORAGE_KEY, fresh)
      return fresh
    })

    vi.stubGlobal('fetch', vi.fn(async () => okResponse()))

    // fetchCloudUser fires /user and /user/pii together through Promise.all
    await Promise.all([
      authAPI('/user', 'GET'),
      authAPI('/user/pii', 'GET'),
    ])

    expect(refreshCalls).toBe(1)
  })

  it('refreshes again once the shared attempt has settled', async () => {
    localStorage.setItem(CLOUD_USER_JWT_LOCALSTORAGE_KEY, makeJwt(10))

    let refreshCalls = 0

    registerCloudTokenRefreshProvider(async () => {
      refreshCalls++
      return makeJwt(10)
    })

    vi.stubGlobal('fetch', vi.fn(async () => okResponse()))

    await authAPI('/user', 'GET')
    await authAPI('/user', 'GET')

    expect(refreshCalls).toBe(2)
  })
})
