import * as fs from 'fs'
import * as os from 'os'

import {
  PortMapperService,
  classifyMappingError,
  isDockerBridgeAddress,
  looksLikeDockerBridge,
} from './port-mapper.service'
import { UpnpClient } from './port-mapper.types'
import { DatabaseService } from '../../database/database.service'
import { OPTIONS } from '../../../utils/options'

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

  it('waits for the HTTPS listener when port mapping is enabled', async () => {
    const { service, factory } = makeService({ [OPTIONS.PORT_MAPPING_ENABLED.name]: 'true' })

    await service.onApplicationBootstrap()
    await flush()

    expect(service.getStatus()).toEqual({ state: 'not_attempted' })
    expect(factory).not.toHaveBeenCalled()
  })

  it('maps via mapIfEnabled when port mapping is enabled', async () => {
    const { service, client } = makeService({ [OPTIONS.PORT_MAPPING_ENABLED.name]: 'true' })

    const status = await service.mapIfEnabled(45678, 24900)

    expect(status).toMatchObject({ state: 'active', internalPort: 45678, externalPort: 24900 })
    expect(client.mappingCalls[0]).toMatchObject({ public: 24900, private: 45678 })
  })

  it('does not map via mapIfEnabled when port mapping is disabled', async () => {
    const { service, factory } = makeService()

    await service.onApplicationBootstrap()
    const status = await service.mapIfEnabled(45678, 24900)

    expect(status).toEqual({ state: 'disabled' })
    expect(factory).not.toHaveBeenCalled()
  })

  it('unmaps an active mapping on graceful shutdown', async () => {
    const { service, client } = makeService()

    await service.enable(24900, 24900)
    await service.onApplicationShutdown()

    expect(client.unmappingCalls).toEqual([{ public: 24900 }])
    expect(client.closed).toBe(true)
  })
})

describe('setEnabled', () => {
  it('maps immediately using the ports the listener already reported', async () => {
    const { service, client } = makeService()
    await service.mapIfEnabled(24900, 24900)

    const status = await service.setEnabled(true)

    expect(status).toMatchObject({ state: 'active', internalPort: 24900 })
    expect(client.mappingCalls).toHaveLength(1)
  })

  // Enabling before the HTTPS listener has bound cannot know which port to map
  it('waits for the listener when no ports are known yet', async () => {
    const { service, client, db } = makeService()

    const status = await service.setEnabled(true)

    expect(status).toMatchObject({ state: 'not_attempted' })
    expect(client.mappingCalls).toHaveLength(0)
    expect(db.options[OPTIONS.PORT_MAPPING_ENABLED.name]).toBe('true')
  })

  it('removes an active mapping when turned off', async () => {
    const { service, client, db } = makeService({ [OPTIONS.PORT_MAPPING_ENABLED.name]: 'true' })
    await service.enable(24900, 24900)

    const status = await service.setEnabled(false)

    expect(status).toMatchObject({ state: 'disabled' })
    expect(client.unmappingCalls).toEqual([{ public: 24900 }])
    expect(db.options[OPTIONS.PORT_MAPPING_ENABLED.name]).toBe('false')
  })
})

describe('docker bridge detection', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  const iface = (address: string, internal = false) => ({
    address,
    netmask: '255.255.0.0',
    family: 'IPv4' as const,
    mac: '00:00:00:00:00:00',
    internal,
    cidr: `${address}/16`,
  })

  it('recognizes addresses inside Docker default bridge pool', () => {
    expect(isDockerBridgeAddress('172.17.0.2')).toBe(true)
    expect(isDockerBridgeAddress('172.31.255.254')).toBe(true)
    expect(isDockerBridgeAddress('172.15.0.2')).toBe(false)
    expect(isDockerBridgeAddress('172.32.0.2')).toBe(false)
    expect(isDockerBridgeAddress('192.168.1.40')).toBe(false)
    expect(isDockerBridgeAddress('not-an-ip')).toBe(false)
  })

  it('needs both a container and bridge-only addressing', () => {
    const bridge = { eth0: [iface('172.17.0.2')] }
    const lan = { eth0: [iface('192.168.1.40')] }

    expect(looksLikeDockerBridge(true, bridge)).toBe(true)
    // Host networking also reports /.dockerenv, so the address is what separates them
    expect(looksLikeDockerBridge(true, lan)).toBe(false)
    expect(looksLikeDockerBridge(false, bridge)).toBe(false)
  })

  it('is not fooled by a host that happens to use 172.16/12', () => {
    expect(looksLikeDockerBridge(false, { eth0: [iface('172.20.5.5')] })).toBe(false)
  })

  it('ignores loopback when judging the addressing', () => {
    const withLoopback = { lo: [iface('127.0.0.1', true)], eth0: [iface('172.17.0.2')] }

    expect(looksLikeDockerBridge(true, withLoopback)).toBe(true)
  })

  it('reports docker_bridge instead of no_gateway inside a bridged container', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(true)
    jest.spyOn(os, 'networkInterfaces').mockReturnValue({ eth0: [iface('172.17.0.2')] })

    const { service, client } = makeService()
    const timeout = new Error('connect ETIMEDOUT') as NodeJS.ErrnoException
    timeout.code = 'ETIMEDOUT'
    client.mappingResults = [{ error: timeout }]

    const status = await service.enable(24900, 24900)

    expect(status).toMatchObject({ state: 'failed', reason: 'docker_bridge' })
  })

  it('still reports no_gateway on a normal host', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(false)

    const { service, client } = makeService()
    const timeout = new Error('connect ETIMEDOUT') as NodeJS.ErrnoException
    timeout.code = 'ETIMEDOUT'
    client.mappingResults = [{ error: timeout }]

    const status = await service.enable(24900, 24900)

    expect(status).toMatchObject({ state: 'failed', reason: 'no_gateway' })
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
