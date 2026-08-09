import { PortMapperService, classifyMappingError } from './port-mapper.service'
import { UpnpClient } from './port-mapper.types'
import { DatabaseService } from '../database/database.service'
import { OPTIONS } from '../../utils/options'

type MappingResult = { error?: Error }

class FakeUpnpClient {
  mappingCalls: { public: number, private: number, ttl: number }[] = []
  unmappingCalls: { public: number }[] = []
  closed = false
  externalIpValue: string | null = '1.2.3.4'

  // Each queued result is consumed by one portMapping call; when the queue is
  // empty the call succeeds
  mappingResults: MappingResult[] = []

  // Callbacks fire on the microtask queue so fake timers never block them
  portMapping(options: { public: number, private: number, ttl: number }, callback: (error: Error | null) => void) {
    this.mappingCalls.push(options)
    const result = this.mappingResults.shift()
    void Promise.resolve().then(() => callback(result?.error ?? null))
  }

  portUnmapping(options: { public: number }, callback: (error: Error | null) => void) {
    this.unmappingCalls.push(options)
    void Promise.resolve().then(() => callback(null))
  }

  externalIp(callback: (error: Error | null, ip?: string) => void) {
    void Promise.resolve().then(() => callback(null, this.externalIpValue ?? undefined))
  }

  close() {
    this.closed = true
  }
}

function makeDb(initial: Record<string, string> = {}) {
  const options: Record<string, string> = { ...initial }
  return {
    options,
    getOption: jest.fn(async (name: string) => options[name]),
    saveOption: jest.fn(async (name: string, value: string) => {
      options[name] = value
      return {}
    }),
  }
}

function makeService(initialOptions: Record<string, string> = {}) {
  const db = makeDb(initialOptions)
  const client = new FakeUpnpClient()
  const factory = jest.fn(() => client as unknown as UpnpClient)
  const service = new PortMapperService(db as unknown as DatabaseService, factory)

  return { service, client, factory, db }
}

function conflictError() {
  return new Error('ConflictInMappingEntry')
}

// Flushes pending microtasks without advancing fake timers
async function flush(passes = 10) {
  for (let i = 0; i < passes; i++) {
    await Promise.resolve()
  }
}

beforeEach(() => {
  jest.useFakeTimers()
})

afterEach(() => {
  jest.useRealTimers()
})

describe('enable', () => {
  it('activates on the first try with the mapping details', async () => {
    const { service, client } = makeService()

    const status = await service.enable(24900, 24900)

    expect(status).toMatchObject({
      state: 'active',
      externalIp: '1.2.3.4',
      externalPort: 24900,
      internalPort: 24900,
    })
    expect((status as { leaseExpiresAt: Date }).leaseExpiresAt).toBeInstanceOf(Date)
    expect(client.mappingCalls).toHaveLength(1)
    expect(client.mappingCalls[0]).toMatchObject({ public: 24900, private: 24900 })
  })

  it('persists the external port for the register message', async () => {
    const { service, client, db } = makeService()
    client.mappingResults = [{ error: conflictError() }]

    await service.enable(24900, 24900)

    expect(db.options[OPTIONS.CONNECT_PUBLIC_PORT.name]).toBe('24901')
  })

  it('activates on the next port after a conflict', async () => {
    const { service, client } = makeService()
    client.mappingResults = [{ error: conflictError() }]

    const status = await service.enable(24900, 24900)

    expect(status).toMatchObject({ state: 'active', externalPort: 24901 })
    expect(client.mappingCalls.map((call) => call.public)).toEqual([24900, 24901])
  })

  it('fails with port_conflict after exhausting all 10 fallback ports', async () => {
    const { service, client } = makeService()
    client.mappingResults = Array.from({ length: 11 }, () => ({ error: conflictError() }))

    const status = await service.enable(24900, 24900)

    expect(status).toMatchObject({ state: 'failed', reason: 'port_conflict' })
    expect(client.mappingCalls).toHaveLength(11)
    expect(client.mappingCalls.map((call) => call.public)).toEqual(
      Array.from({ length: 11 }, (_, i) => 24900 + i),
    )
  })

  it('fails with no_gateway on a timeout without trying other ports', async () => {
    const { service, client } = makeService()
    const timeout = new Error('connect ETIMEDOUT') as NodeJS.ErrnoException
    timeout.code = 'ETIMEDOUT'
    client.mappingResults = [{ error: timeout }]

    const status = await service.enable(24900, 24900)

    expect(status).toMatchObject({ state: 'failed', reason: 'no_gateway' })
    expect(client.mappingCalls).toHaveLength(1)
  })
})

describe('lease renewal', () => {
  it('re-creates the mapping with the same params after 20 minutes', async () => {
    const { service, client } = makeService()

    await service.enable(24900, 24900)
    expect(client.mappingCalls).toHaveLength(1)

    jest.advanceTimersByTime(20 * 60 * 1000)
    await flush()

    expect(client.mappingCalls).toHaveLength(2)
    expect(client.mappingCalls[1]).toMatchObject({ public: 24900, private: 24900 })
  })

  it('transitions active → failed when a renewal fails', async () => {
    const { service, client } = makeService()

    await service.enable(24900, 24900)
    expect(service.getStatus().state).toBe('active')

    client.mappingResults = [{ error: conflictError() }]
    jest.advanceTimersByTime(20 * 60 * 1000)
    await flush()

    expect(service.getStatus().state).toBe('failed')
  })

  it('recovers failed → active on the next successful renewal', async () => {
    const { service, client } = makeService()

    await service.enable(24900, 24900)

    client.mappingResults = [{ error: conflictError() }]
    jest.advanceTimersByTime(20 * 60 * 1000)
    await flush()
    expect(service.getStatus().state).toBe('failed')

    jest.advanceTimersByTime(20 * 60 * 1000)
    await flush()
    expect(service.getStatus().state).toBe('active')
  })
})

describe('disable', () => {
  it('removes the mapping and persists the disabled state', async () => {
    const { service, client, db } = makeService()

    await service.enable(24900, 24900)
    await service.disable()

    expect(client.unmappingCalls).toEqual([{ public: 24900 }])
    expect(service.getStatus()).toEqual({ state: 'disabled' })
    expect(db.options[OPTIONS.PORT_MAPPING_ENABLED.name]).toBe('false')
    expect(db.options[OPTIONS.CONNECT_PUBLIC_PORT.name]).toBe('')
  })
})

describe('lifecycle hooks', () => {
  it('does nothing on boot when port mapping is disabled', async () => {
    const { service, factory } = makeService()

    await service.onApplicationBootstrap()
    await flush()

    expect(service.getStatus()).toEqual({ state: 'disabled' })
    expect(factory).not.toHaveBeenCalled()
  })

  it('maps on boot when port mapping is enabled', async () => {
    const { service, client } = makeService({ [OPTIONS.PORT_MAPPING_ENABLED.name]: 'true' })

    await service.onApplicationBootstrap()
    await flush()

    expect(service.getStatus().state).toBe('active')
    expect(client.mappingCalls).toHaveLength(1)
  })

  it('unmaps an active mapping on graceful shutdown', async () => {
    const { service, client } = makeService()

    await service.enable(24900, 24900)
    await service.onApplicationShutdown()

    expect(client.unmappingCalls).toEqual([{ public: 24900 }])
    expect(client.closed).toBe(true)
  })
})

describe('classifyMappingError', () => {
  it('normalizes conflicts, timeouts, and everything else', () => {
    expect(classifyMappingError(new Error('ConflictInMappingEntry'))).toBe('port_conflict')
    expect(classifyMappingError(new Error('Error 718'))).toBe('port_conflict')

    const timeout = new Error('connect ETIMEDOUT') as NodeJS.ErrnoException
    timeout.code = 'ETIMEDOUT'
    expect(classifyMappingError(timeout)).toBe('no_gateway')
    expect(classifyMappingError(new Error('request timed out'))).toBe('no_gateway')

    expect(classifyMappingError(new Error('something else'))).toBe('unknown')
  })
})
