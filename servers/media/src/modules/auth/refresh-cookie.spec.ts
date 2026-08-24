import { buildRefreshCookieName, REFRESH_COOKIE_PATH, REFRESH_TOLKIEN_COOKIE_PREFIX } from './refresh-cookie'

describe('buildRefreshCookieName', () => {
  it('namespaces the cookie with the first 8 characters of the instance ID', () => {
    expect(buildRefreshCookieName('3f9a1c2e-aaaa-bbbb-cccc-ddddeeeeffff'))
      .toBe('cardinal_refresh_tolkien_3f9a1c2e')
  })

  /*
   * The whole point of the namespace: cookies are keyed by host, so two servers on one IP would
   * otherwise write to the same jar slot and destroy each other's sessions.
   */
  it('gives two servers on the same host different cookie names', () => {
    const first = buildRefreshCookieName('11111111-aaaa-bbbb-cccc-ddddeeeeffff')
    const second = buildRefreshCookieName('22222222-aaaa-bbbb-cccc-ddddeeeeffff')

    expect(first).not.toBe(second)
  })

  // Naming a cookie without an instance ID would put every such server back in one shared slot
  it('refuses to name a cookie without an instance ID', () => {
    expect(() => buildRefreshCookieName(null as unknown as string)).toThrow()
    expect(() => buildRefreshCookieName(undefined as unknown as string)).toThrow()
    expect(() => buildRefreshCookieName('')).toThrow()
    expect(() => buildRefreshCookieName('   ')).toThrow()
  })

  it('never names the cookie after the prefix alone', () => {
    expect(buildRefreshCookieName('3f9a1c2e-aaaa-bbbb-cccc-ddddeeeeffff')).not.toBe(REFRESH_TOLKIEN_COOKIE_PREFIX)
  })

  it('produces a name browsers accept as a cookie name', () => {
    expect(buildRefreshCookieName('3f9a1c2e-aaaa-bbbb-cccc-ddddeeeeffff')).toMatch(/^[\w-]+$/)
  })

  it('scopes the cookie to the auth endpoints', () => {
    expect(REFRESH_COOKIE_PATH).toBe('/api/v1/auth')
  })
})
