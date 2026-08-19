import { describe, it, expect, vi, afterEach } from 'vitest'

import {
  REMOTE_ACCESS_FEATURE_SLUGS,
  SERVICE_ACCESS_REQUIRED_CODE,
  getServiceAccess,
  isQueuedForRemoteAccess,
  isServiceAccessRefusal,
  retractServiceAccess,
  serviceAccessIndicator,
} from './serviceAccess'
import type { ServiceAccessFeature } from './serviceAccess'

const feature = (
  slug: string,
  mode: ServiceAccessFeature['mode'],
  status: ServiceAccessFeature['status'],
): ServiceAccessFeature => ({
  slug,
  name: slug,
  mode,
  status,
  requestedAt: null,
  decidedAt: null,
})

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('serviceAccessIndicator', () => {
  it('reads as loading until the account grants have been fetched', () => {
    expect(serviceAccessIndicator(null, 'remote_access_direct')).toBe('loading')
  })

  it('grants an approved feature and queues a pending one', () => {
    const features = [
      feature('remote_access_direct', 'gated', 'approved'),
      feature('remote_access_relay', 'gated', 'pending'),
    ]

    expect(serviceAccessIndicator(features, 'remote_access_direct')).toBe('granted')
    expect(serviceAccessIndicator(features, 'remote_access_relay')).toBe('queued')
  })

  it('grants an open feature no matter what the account grant says', () => {
    for (const status of ['none', 'pending', 'retracted', 'denied'] as const) {
      const features = [feature('remote_access_relay', 'open', status)]
      expect(serviceAccessIndicator(features, 'remote_access_relay')).toBe('granted')
    }
  })

  it('reports a feature the account has no grant row for as unavailable, not queued', () => {
    expect(serviceAccessIndicator([], 'remote_access_direct')).toBe('unavailable')
  })

  it('separates retracted and none from an actual queue entry', () => {
    for (const status of ['retracted', 'none'] as const) {
      const features = [feature('remote_access_direct', 'gated', status)]
      expect(serviceAccessIndicator(features, 'remote_access_direct')).toBe('unavailable')
    }
  })

  // A refusal is a decision the UI shows, not the same silence as an account that never asked
  it('reports a denied grant as denied rather than merely unavailable', () => {
    const features = [feature('remote_access_direct', 'gated', 'denied')]
    expect(serviceAccessIndicator(features, 'remote_access_direct')).toBe('denied')
  })
})

describe('isQueuedForRemoteAccess', () => {
  it('is false before the grants are known', () => {
    expect(isQueuedForRemoteAccess(null)).toBe(false)
  })

  it('is true while either path is awaiting a decision', () => {
    expect(isQueuedForRemoteAccess([
      feature('remote_access_direct', 'gated', 'pending'),
      feature('remote_access_relay', 'gated', 'none'),
    ])).toBe(true)

    expect(isQueuedForRemoteAccess([
      feature('remote_access_direct', 'gated', 'denied'),
      feature('remote_access_relay', 'gated', 'pending'),
    ])).toBe(true)
  })

  it('is false once a pending request no longer gates the feature', () => {
    expect(isQueuedForRemoteAccess([feature('remote_access_relay', 'open', 'pending')])).toBe(false)
  })

  it('is false for grants that are not waiting on anybody', () => {
    expect(isQueuedForRemoteAccess([
      feature('remote_access_direct', 'gated', 'approved'),
      feature('remote_access_relay', 'gated', 'retracted'),
    ])).toBe(false)
  })

  it('ignores pending requests for other features', () => {
    expect(isQueuedForRemoteAccess([feature('popularity_data_pool', 'gated', 'pending')])).toBe(false)
  })

  /* An account with no grants at all used to light up the per-path indicators while this stayed
     false, so the rows claimed a wait the alert denied. Both now read the same answer. */
  it('agrees with the per-path indicator for an account that has no grants', () => {
    expect(isQueuedForRemoteAccess([])).toBe(false)

    for (const slug of REMOTE_ACCESS_FEATURE_SLUGS) {
      expect(serviceAccessIndicator([], slug)).not.toBe('queued')
    }
  })
})

describe('isServiceAccessRefusal', () => {
  it('recognizes the refusal code on the error body', () => {
    expect(isServiceAccessRefusal({ status: 403, data: { code: SERVICE_ACCESS_REQUIRED_CODE } })).toBe(true)
  })

  it('recognizes the code when the media server passes it through in the message', () => {
    expect(isServiceAccessRefusal({
      status: 500,
      data: { message: `Could not enable Remote Access: ${SERVICE_ACCESS_REQUIRED_CODE}` },
    })).toBe(true)
  })

  it('recognizes a plain 403 carrying the code as a string body', () => {
    expect(isServiceAccessRefusal({ status: 403, data: SERVICE_ACCESS_REQUIRED_CODE })).toBe(true)
  })

  it('ignores unrelated failures', () => {
    expect(isServiceAccessRefusal({ status: 409, data: { message: 'No server slots left' } })).toBe(false)
    expect(isServiceAccessRefusal({ status: 500, data: { message: 'boom' } })).toBe(false)
    expect(isServiceAccessRefusal(undefined)).toBe(false)
    expect(isServiceAccessRefusal(new Error('nope'))).toBe(false)
  })
})

describe('getServiceAccess', () => {
  it('reads the account grants from the cloud IDP', async () => {
    const features = [feature('remote_access_direct', 'gated', 'pending')]
    const fetchMock = vi.fn(async () => jsonResponse(200, { features }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(getServiceAccess()).resolves.toEqual(features)

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url.endsWith('/user/service-access')).toBe(true)
    expect(init.method).toBe('GET')
  })

  it('reads an empty list when the response carries no features', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(200, {})))

    await expect(getServiceAccess()).resolves.toEqual([])
  })
})

describe('retractServiceAccess', () => {
  it('posts the requested slugs to the retractions endpoint', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(200, {}))
    vi.stubGlobal('fetch', fetchMock)

    await retractServiceAccess([...REMOTE_ACCESS_FEATURE_SLUGS])

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url.endsWith('/user/service-access/retractions')).toBe(true)
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({
      features: ['remote_access_direct', 'remote_access_relay'],
    })
  })

  it('swallows a failed retraction so it can never break a disable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(500, { message: 'boom' })))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await expect(retractServiceAccess(['remote_access_relay'])).resolves.toBeUndefined()
    expect(warn).toHaveBeenCalled()

    warn.mockRestore()
  })

  it('does not call the cloud at all for an empty slug list', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(200, {}))
    vi.stubGlobal('fetch', fetchMock)

    await retractServiceAccess([])

    expect(fetchMock).not.toHaveBeenCalled()
  })
})
