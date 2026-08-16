import { describe, it, expect, beforeEach } from 'vitest'

import { attemptCookieBootstrap } from './cookieBootstrap'
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

// Installs a refresh provider with the given outcome, and counts how often it ran
const provider = (outcome: () => Promise<string>) => {
  const calls = { count: 0 }

  registerCloudTokenRefreshProvider(async () => {
    calls.count++
    return outcome()
  })

  return calls
}

beforeEach(() => {
  localStorage.clear()
})

describe('attemptCookieBootstrap', () => {
  /* The access token lives in storage and does not survive being cleared, but the refresh cookie
     outlives it — a browser holding only the cookie still has a session worth resuming. */
  it('resumes the session from the refresh cookie when storage has no token', async () => {
    const fresh = makeJwt(900)
    const refresh = provider(async () => {
      localStorage.setItem(CLOUD_USER_JWT_LOCALSTORAGE_KEY, fresh)
      return fresh
    })

    await expect(attemptCookieBootstrap()).resolves.toBe(true)
    expect(refresh.count).toBe(1)
    expect(localStorage.getItem(CLOUD_USER_JWT_LOCALSTORAGE_KEY)).toBe(fresh)
  })

  // A visitor who was never signed in gets here too, and has nothing to be told about
  it('gives up quietly when the cookie is missing or spent', async () => {
    const refresh = provider(async () => {
      throw Object.assign(new Error('Invalid or expired refresh token'), { code: 401 })
    })

    await expect(attemptCookieBootstrap()).resolves.toBe(false)
    expect(refresh.count).toBe(1)
    expect(localStorage.getItem(CLOUD_USER_JWT_LOCALSTORAGE_KEY)).toBeNull()
  })

  it('spends nothing when a token is already in storage', async () => {
    const token = makeJwt(900)
    localStorage.setItem(CLOUD_USER_JWT_LOCALSTORAGE_KEY, token)
    const refresh = provider(async () => makeJwt(900))

    await expect(attemptCookieBootstrap()).resolves.toBe(true)
    expect(refresh.count).toBe(0)
    expect(localStorage.getItem(CLOUD_USER_JWT_LOCALSTORAGE_KEY)).toBe(token)
  })
})
