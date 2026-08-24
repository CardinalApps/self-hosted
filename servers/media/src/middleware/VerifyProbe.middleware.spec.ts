import { signProbeHeader } from '@cardinalapps/remote-access'

import { VerifyProbe } from './VerifyProbe.middleware'

import { OPTIONS } from '../utils/options'

const SIGNING_KEY = new Uint8Array(32).fill(7)
const INSTANCE_ID = 'test-instance-id'

function mockDatabaseService(options: Record<string, unknown> = {}) {
  const values = {
    [OPTIONS.CONNECT_SIGNING_KEY.name]: Buffer.from(SIGNING_KEY).toString('base64'),
    [OPTIONS.INSTANCE_ID.name]: INSTANCE_ID,
    ...options,
  }
  return {
    getOption: jest.fn(async (name: string) => values[name] ?? null),
  }
}

function mockRequest(headers: Record<string, string>) {
  return { headers } as { headers: Record<string, string>, isValidProbe?: boolean, isInvalidProbe?: boolean }
}

describe('VerifyProbe middleware', () => {
  it('accepts a validly signed probe', async () => {
    const middleware = new VerifyProbe(mockDatabaseService() as never)
    const req = mockRequest({
      'x-cardinal-probe': '1',
      'x-cardinal-probe-signature': await signProbeHeader(SIGNING_KEY, INSTANCE_ID, new Date()),
    })
    const next = jest.fn()

    await middleware.use(req, {} as never, next)

    expect(req.isValidProbe).toBe(true)
    expect(req.isInvalidProbe).toBeUndefined()
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('flags a request without the probe header', async () => {
    const db = mockDatabaseService()
    const middleware = new VerifyProbe(db as never)
    const req = mockRequest({})
    const next = jest.fn()

    await middleware.use(req, {} as never, next)

    expect(req.isInvalidProbe).toBe(true)
    expect(req.isValidProbe).toBeUndefined()
    // Non-probe traffic must not cost a database read
    expect(db.getOption).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('flags a probe without a signature header', async () => {
    const middleware = new VerifyProbe(mockDatabaseService() as never)
    const req = mockRequest({ 'x-cardinal-probe': '1' })
    const next = jest.fn()

    await middleware.use(req, {} as never, next)

    expect(req.isInvalidProbe).toBe(true)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('flags a tampered signature', async () => {
    const middleware = new VerifyProbe(mockDatabaseService() as never)
    const tsSec = Math.floor(Date.now() / 1000)
    const req = mockRequest({
      'x-cardinal-probe': '1',
      'x-cardinal-probe-signature': `${tsSec}:${Buffer.alloc(32, 9).toString('base64')}`,
    })
    const next = jest.fn()

    await middleware.use(req, {} as never, next)

    expect(req.isInvalidProbe).toBe(true)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('flags a tampered timestamp', async () => {
    const middleware = new VerifyProbe(mockDatabaseService() as never)
    const signature = await signProbeHeader(SIGNING_KEY, INSTANCE_ID, new Date())
    const [tsSec, hmac] = signature.split(':')
    const req = mockRequest({
      'x-cardinal-probe': '1',
      'x-cardinal-probe-signature': `${Number(tsSec) + 10}:${hmac}`,
    })
    const next = jest.fn()

    await middleware.use(req, {} as never, next)

    expect(req.isInvalidProbe).toBe(true)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('flags an expired timestamp', async () => {
    const middleware = new VerifyProbe(mockDatabaseService() as never)
    const expired = new Date(Date.now() - 301_000)
    const req = mockRequest({
      'x-cardinal-probe': '1',
      'x-cardinal-probe-signature': await signProbeHeader(SIGNING_KEY, INSTANCE_ID, expired),
    })
    const next = jest.fn()

    await middleware.use(req, {} as never, next)

    expect(req.isInvalidProbe).toBe(true)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('flags a probe when the signing key is not provisioned', async () => {
    const middleware = new VerifyProbe(
      mockDatabaseService({ [OPTIONS.CONNECT_SIGNING_KEY.name]: null }) as never,
    )
    const req = mockRequest({
      'x-cardinal-probe': '1',
      'x-cardinal-probe-signature': await signProbeHeader(SIGNING_KEY, INSTANCE_ID, new Date()),
    })
    const next = jest.fn()

    await middleware.use(req, {} as never, next)

    expect(req.isInvalidProbe).toBe(true)
    expect(req.isValidProbe).toBeUndefined()
    expect(next).toHaveBeenCalledTimes(1)
  })
})
