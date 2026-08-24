import {
  test,
  expect,
  describe,
  beforeEach,
  afterEach,
} from '@jest/globals'

import {
  getBearerToken,
  registerBearerTokenProvider,
  resetBearerTokenProvider,
} from '../src/bearerToken'
import { fetchRemoteAccessAPI } from '../src/remote-access/edge/fetchRemoteAccessAPI'
import { fetchPopularityAPI } from '../src/popularity/edge/fetchPopularityAPI'
import { fetchFeedbackAPI } from '../src/feedback/edge/fetchFeedbackAPI'

const CLOUD_USER_JWT_LOCALSTORAGE_KEY = '@cardinal/cloud_user_tolkien'

type CapturedRequest = { url: string, init: RequestInit }

let requests: CapturedRequest[] = []

// Records every outbound request instead of hitting the network
function stubFetch() {
  requests = []
  globalThis.fetch = ((url: string, init: RequestInit) => {
    requests.push({ url, init })
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
  }) as unknown as typeof fetch
}

// Jest's node environment has no localStorage, so the browser default path needs one
function stubLocalStorage(stored: Record<string, string>) {
  Object.defineProperty(globalThis, 'localStorage', {
    value: { getItem: (key: string) => stored[key] ?? null },
    configurable: true,
    writable: true,
  })
}

function removeLocalStorage() {
  delete (globalThis as { localStorage?: unknown }).localStorage
}

const headersOf = (index = 0) => requests[index].init.headers as Record<string, string>

beforeEach(() => {
  stubFetch()
  removeLocalStorage()
})

afterEach(() => {
  resetBearerTokenProvider()
  removeLocalStorage()
})

describe('the default bearer token provider', () => {
  test('reads the cloud user JWT out of localStorage', async () => {
    stubLocalStorage({ [CLOUD_USER_JWT_LOCALSTORAGE_KEY]: 'stored-token' })

    await expect(getBearerToken()).resolves.toBe('stored-token')
  })

  test('resolves null when localStorage holds no cloud user JWT', async () => {
    stubLocalStorage({})

    await expect(getBearerToken()).resolves.toBeNull()
  })

  test('resolves null outside of a browser, where there is no localStorage', async () => {
    await expect(getBearerToken()).resolves.toBeNull()
  })
})

describe('registerBearerTokenProvider', () => {
  test('replaces the default localStorage read', async () => {
    stubLocalStorage({ [CLOUD_USER_JWT_LOCALSTORAGE_KEY]: 'stored-token' })
    registerBearerTokenProvider(async () => 'injected-token')

    await expect(getBearerToken()).resolves.toBe('injected-token')
  })

  test('resetBearerTokenProvider restores the default localStorage read', async () => {
    stubLocalStorage({ [CLOUD_USER_JWT_LOCALSTORAGE_KEY]: 'stored-token' })
    registerBearerTokenProvider(async () => 'injected-token')
    resetBearerTokenProvider()

    await expect(getBearerToken()).resolves.toBe('stored-token')
  })
})

describe('the edge fetchers', () => {
  test('await the registered provider before sending the Authorization header', async () => {
    registerBearerTokenProvider(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5))
      return 'refreshed-token'
    })

    await fetchRemoteAccessAPI('/admin/servers', 'GET', 'prod', { accessToken: true })
    await fetchPopularityAPI('/api/stats', 'GET', 'prod', { accessToken: true })
    await fetchFeedbackAPI('/query', 'GET', 'prod', { accessToken: true })

    expect(requests).toHaveLength(3)
    expect(headersOf(0).Authorization).toBe('Bearer refreshed-token')
    expect(headersOf(1).Authorization).toBe('Bearer refreshed-token')
    expect(headersOf(2).Authorization).toBe('Bearer refreshed-token')
  })

  test('fall back to the stored token when nothing has been registered', async () => {
    stubLocalStorage({ [CLOUD_USER_JWT_LOCALSTORAGE_KEY]: 'stored-token' })

    await fetchRemoteAccessAPI('/admin/servers', 'GET', 'prod', { accessToken: true })

    expect(headersOf().Authorization).toBe('Bearer stored-token')
  })

  test('do not consult the provider when the caller did not ask for the access token', async () => {
    let providerCalls = 0
    registerBearerTokenProvider(async () => {
      providerCalls++
      return 'injected-token'
    })

    await fetchPopularityAPI('/api/stats', 'GET', 'prod')

    expect(providerCalls).toBe(0)
    expect(headersOf().Authorization).toBeUndefined()
  })

  test('leave an Authorization header supplied by the caller in place', async () => {
    registerBearerTokenProvider(async () => 'injected-token')

    await fetchPopularityAPI('/api/report', 'POST', 'prod', {
      accessToken: true,
      headers: { Authorization: 'Bearer caller-token' },
      body: { hello: 'world' },
    })

    expect(headersOf().Authorization).toBe('Bearer caller-token')
  })

  test('reject when the provider throws instead of leaking an unhandled rejection', async () => {
    registerBearerTokenProvider(async () => {
      throw new Error('refresh failed')
    })

    await expect(
      fetchRemoteAccessAPI('/admin/servers', 'GET', 'prod', { accessToken: true }),
    ).rejects.toThrow('refresh failed')
    expect(requests).toHaveLength(0)
  })
})
