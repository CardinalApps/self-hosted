import { GoneException } from '@nestjs/common'

import { RevokeDisabledUserSessions } from './RevokeDisabledUserSessions.middleware'

function mockResponse() {
  const headers: Record<string, string> = {}
  return {
    headers,
    header: jest.fn((k: string, v: string) => { headers[k] = v }),
    setHeader: jest.fn((k: string, v: string) => { headers[k] = v }),
  }
}

describe('RevokeDisabledUserSessions middleware', () => {
  const middleware = new RevokeDisabledUserSessions()

  it('rejects a disabled user with an uncacheable 410', async () => {
    const res = mockResponse()
    const next = jest.fn()

    await expect(
      middleware.use({ user: { enabled: false } }, res as never, next),
    ).rejects.toBeInstanceOf(GoneException)

    // The auth failure must not be cacheable, or the client can loop on it.
    expect(res.headers['Cache-Control']).toBe('no-store')
    expect(next).not.toHaveBeenCalled()
  })

  it('lets an enabled user through', async () => {
    const res = mockResponse()
    const next = jest.fn()

    await middleware.use({ user: { enabled: true } }, res as never, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(res.headers['Cache-Control']).toBeUndefined()
  })
})
