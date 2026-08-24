import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import handleCloudAuth401 from './handleCloudAuth401'
import authAPI, { registerCloudTokenRefreshProvider } from '../../../../lib/auth/authAPI'
import { CLOUD_USER_JWT_LOCALSTORAGE_KEY, setJWT, JWT_TYPE } from '../../../../lib/auth/jwt'

const base64url = (value: object) =>
  btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_')

// A syntactically valid JWT whose payload expires in `secondsUntilExpiry`
const makeJwt = (secondsUntilExpiry: number) => [
  base64url({ alg: 'HS256', typ: 'JWT' }),
  base64url({ exp: Math.floor(Date.now() / 1000) + secondsUntilExpiry }),
  'signature',
].join('.')

const unauthorized = () => new Response('{}', { status: 401, headers: { 'content-type': 'application/json' } })

/* What `dispatch(refreshToken()).unwrap()` actually throws: RTK serializes thunk errors down to
   name/message/stack/code, so the HTTP status reaches callers on `code`. */
const serializedRejection = (code: number, message: string) => ({ name: 'Error', message, code })

// Installs a refresh provider with the given outcome, and counts how often it ran
const provider = (outcome: () => Promise<string>) => {
  const calls = { count: 0 }

  registerCloudTokenRefreshProvider(async () => {
    calls.count++
    return outcome()
  })

  return calls
}

const succeeds = (delayMs = 0) => provider(async () => {
  if (delayMs) {
    await new Promise((resolve) => setTimeout(resolve, delayMs))
  }

  const fresh = makeJwt(900)
  localStorage.setItem(CLOUD_USER_JWT_LOCALSTORAGE_KEY, fresh)

  return fresh
})

const failsWith = (error: unknown) => provider(async () => {
  throw error
})

const storedCloudToken = () => localStorage.getItem(CLOUD_USER_JWT_LOCALSTORAGE_KEY)

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  setJWT('cloud-token', JWT_TYPE.CLOUD_USER)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('handleCloudAuth401 endpoint matching', () => {
  /* The Sessions page lists sessions at a path one letter away from the logout call, and used to be
     treated as one: a 401 there signed the browser out instead of renewing the token. */
  it('refreshes on a 401 from the sessions list', async () => {
    const refresh = succeeds()
    const dispatch = vi.fn()

    await handleCloudAuth401(unauthorized(), '/user/sessions', 'GET', undefined, dispatch)

    expect(refresh.count).toBe(1)
    expect(dispatch).not.toHaveBeenCalled()
  })

  // Revoking another device is an ordinary request; only signing this browser out is terminal
  it('refreshes on a 401 from revoking another device', async () => {
    const refresh = succeeds()
    const dispatch = vi.fn()

    await handleCloudAuth401(unauthorized(), '/user/session?sid=other-device', 'DELETE', undefined, dispatch)

    expect(refresh.count).toBe(1)
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('ends the cloud session on a 401 from signing out, without refreshing', async () => {
    const refresh = succeeds()
    const dispatch = vi.fn()

    await handleCloudAuth401(unauthorized(), '/user/session', 'DELETE', undefined, dispatch)

    expect(refresh.count).toBe(0)
    expect(storedCloudToken()).toBeNull()
    expect(dispatch).toHaveBeenCalledWith({ type: 'cloudUser/logout/fulfilled' })
  })

  it('ends the cloud session when the refresh endpoint itself is refused', async () => {
    const refresh = succeeds()
    const dispatch = vi.fn()

    await handleCloudAuth401(unauthorized(), '/auth/refresh', 'POST', undefined, dispatch)

    expect(refresh.count).toBe(0)
    expect(storedCloudToken()).toBeNull()
    expect(dispatch).toHaveBeenCalledWith({ type: 'cloudUser/logout/fulfilled' })
  })

  it('ignores anything that is not a 401', async () => {
    const refresh = succeeds()
    const dispatch = vi.fn()

    await handleCloudAuth401(new Response('{}', { status: 503 }), '/user/sessions', 'GET', undefined, dispatch)

    expect(refresh.count).toBe(0)
    expect(storedCloudToken()).toBe('cloud-token')
    expect(dispatch).not.toHaveBeenCalled()
  })
})

describe('handleCloudAuth401 refresh outcomes', () => {
  /* The auth server answers 503 and keeps the refresh cookie when it is merely having trouble, so
     an outage must cost the request, not the session. */
  it('keeps the session when the refresh fails transiently', async () => {
    const refresh = failsWith(serializedRejection(503, 'The Cardinal cloud could not be reached.'))
    const dispatch = vi.fn()

    await handleCloudAuth401(unauthorized(), '/user', 'GET', undefined, dispatch)

    expect(refresh.count).toBe(1)
    expect(storedCloudToken()).toBe('cloud-token')
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('keeps the session when the refresh never reaches the server', async () => {
    const refresh = failsWith(new TypeError('Failed to fetch'))
    const dispatch = vi.fn()

    await handleCloudAuth401(unauthorized(), '/user', 'GET', undefined, dispatch)

    expect(refresh.count).toBe(1)
    expect(storedCloudToken()).toBe('cloud-token')
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('ends the cloud session when the refresh is refused', async () => {
    failsWith(serializedRejection(401, 'Invalid or expired refresh token'))
    const dispatch = vi.fn()

    await handleCloudAuth401(unauthorized(), '/user', 'GET', undefined, dispatch)

    expect(storedCloudToken()).toBeNull()
    expect(dispatch).toHaveBeenCalledWith({ type: 'cloudUser/logout/fulfilled' })
  })

  it('leaves the token in place when the refresh succeeds', async () => {
    const refresh = succeeds()
    const dispatch = vi.fn()

    await handleCloudAuth401(unauthorized(), '/user', 'GET', undefined, dispatch)

    expect(refresh.count).toBe(1)
    expect(storedCloudToken()).not.toBeNull()
    expect(dispatch).not.toHaveBeenCalled()
  })

  /* A page that fires several cloud requests at once gets several 401s, and each one used to be
     able to spend the refresh cookie: the reactive and proactive paths now share one attempt. */
  it('shares one refresh with the proactive path', async () => {
    localStorage.setItem(CLOUD_USER_JWT_LOCALSTORAGE_KEY, makeJwt(10))
    // The real refresh is a network round trip, so concurrent callers overlap
    const refresh = succeeds(10)
    const dispatch = vi.fn()

    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }),
    ))

    await Promise.all([
      authAPI('/user', 'GET'),
      handleCloudAuth401(unauthorized(), '/user/sessions', 'GET', undefined, dispatch),
      handleCloudAuth401(unauthorized(), '/user/claims', 'GET', undefined, dispatch),
    ])

    expect(refresh.count).toBe(1)
  })
})
