import { Repository } from 'typeorm'

import { CorsService, normalizeOrigin } from './cors.service'
import { CorsOrigin } from './cors-origin.entity'
import { DatabaseService } from '../database/database.service'
import { OPTIONS } from '../../utils/options'

// In-memory stand-ins for the repository and the options table
function makeRepository(rows: Partial<CorsOrigin>[] = []) {
  const state = { rows: [...rows] }

  const repository = {
    find: jest.fn(async () => state.rows),
    findOne: jest.fn(async ({ where }: { where: { origin: string } }) => {
      return state.rows.find((row) => row.origin === where.origin) ?? null
    }),
    save: jest.fn(async (row: Partial<CorsOrigin>) => {
      const saved = { ...row, corsOriginId: `uuid-${state.rows.length}` }
      state.rows.push(saved)
      return saved
    }),
    delete: jest.fn(async ({ corsOriginId }: { corsOriginId: string }) => {
      const before = state.rows.length
      state.rows = state.rows.filter((row) => row.corsOriginId !== corsOriginId)
      return { affected: before - state.rows.length }
    }),
  }

  return { repository, state }
}

function makeDb(options: Record<string, string | undefined> = {}) {
  return {
    getOption: jest.fn(async (name: string) => options[name]),
  }
}

function makeService(rows: Partial<CorsOrigin>[] = [], options: Record<string, string | undefined> = {}) {
  const { repository, state } = makeRepository(rows)
  const db = makeDb(options)
  const service = new CorsService(
    repository as unknown as Repository<CorsOrigin>,
    db as unknown as DatabaseService,
  )

  return { service, repository, state, db }
}

describe('CorsService.isOriginAllowed', () => {
  it('allows an undefined origin (same-origin / non-browser callers)', async () => {
    const { service } = makeService()
    expect(await service.isOriginAllowed(undefined)).toBe(true)
  })

  describe('Cardinal hosted apps wildcard', () => {
    it('allows https subdomains of cardinalapps.io', async () => {
      const { service } = makeService()
      expect(await service.isOriginAllowed('https://music.cardinalapps.io')).toBe(true)
    })

    it('allows the apex domain with no subdomain', async () => {
      const { service } = makeService()
      expect(await service.isOriginAllowed('https://cardinalapps.io')).toBe(true)
    })

    it('denies lookalike domains that embed the real one', async () => {
      const { service } = makeService()
      expect(await service.isOriginAllowed('https://music.cardinalapps.io.evil.com')).toBe(false)
    })

    it('denies http (non-https) on the hosted domain', async () => {
      const { service } = makeService()
      expect(await service.isOriginAllowed('http://music.cardinalapps.io')).toBe(false)
    })

    it('denies unanchored suffix matches', async () => {
      const { service } = makeService()
      expect(await service.isOriginAllowed('https://music.cardinalapps.ioz')).toBe(false)
    })
  })

  describe('own hostname', () => {
    it('allows the assigned Connect hostname on any port and scheme', async () => {
      const { service } = makeService([], {
        [OPTIONS.CONNECT_HOSTNAME.name]: 'abc123.connect.cardinalapps.host',
      })

      /* The port is deliberately ignored: it is the same Media Server no
         matter which port the client reached it through. */
      expect(await service.isOriginAllowed('https://abc123.connect.cardinalapps.host:24900')).toBe(true)
      expect(await service.isOriginAllowed('https://abc123.connect.cardinalapps.host')).toBe(true)
      expect(await service.isOriginAllowed('http://abc123.connect.cardinalapps.host:3080')).toBe(true)
    })

    it('allows the BYO hostname', async () => {
      const { service } = makeService([], {
        [OPTIONS.CONNECT_BYO_HOSTNAME.name]: 'media.example.com',
      })

      expect(await service.isOriginAllowed('https://media.example.com')).toBe(true)
    })

    /* The vanity name is on the same certificate as the assigned one, so a client that dialled it is
       talking to this very server — refusing it would break the URL the owner is actually handed. */
    it('allows the live vanity hostname', async () => {
      const { service } = makeService([], {
        [OPTIONS.CONNECT_HOSTNAME.name]: 'abc123.connect.cardinalapps.host',
        [OPTIONS.CONNECT_VANITY_HOSTNAME.name]: 'brians-server.connect.cardinalapps.host',
      })

      expect(await service.isOriginAllowed('https://brians-server.connect.cardinalapps.host')).toBe(true)
      expect(await service.isOriginAllowed('https://brians-server.connect.cardinalapps.host:24900')).toBe(true)
    })

    it('denies a vanity hostname that has been retracted', async () => {
      const { service } = makeService([], { [OPTIONS.CONNECT_VANITY_HOSTNAME.name]: '' })

      expect(await service.isOriginAllowed('https://brians-server.connect.cardinalapps.host')).toBe(false)
    })

    it('denies other hostnames when no own hostname is set', async () => {
      const { service } = makeService()
      expect(await service.isOriginAllowed('https://abc123.connect.cardinalapps.host')).toBe(false)
    })
  })

  describe('localhost development origins', () => {
    it('allows localhost and 127.0.0.1 on any port', async () => {
      const { service } = makeService()
      expect(await service.isOriginAllowed('http://localhost')).toBe(true)
      expect(await service.isOriginAllowed('http://localhost:3000')).toBe(true)
      expect(await service.isOriginAllowed('http://localhost:65535')).toBe(true)
      expect(await service.isOriginAllowed('http://127.0.0.1:80')).toBe(true)
    })

    it('denies lookalike localhost domains', async () => {
      const { service } = makeService()
      expect(await service.isOriginAllowed('http://localhost.evil.com')).toBe(false)
    })
  })

  describe('custom origin allowlist', () => {
    it('allows an origin after it is added and denies it after removal', async () => {
      const { service } = makeService()

      expect(await service.isOriginAllowed('https://birdhouse.example.com:8123')).toBe(false)

      const saved = await service.addCustomOrigin('https://birdhouse.example.com:8123')
      expect(await service.isOriginAllowed('https://birdhouse.example.com:8123')).toBe(true)

      await service.removeCustomOrigin(saved.corsOriginId)
      expect(await service.isOriginAllowed('https://birdhouse.example.com:8123')).toBe(false)
    })

    it('returns the existing row instead of inserting a duplicate', async () => {
      const { service, repository } = makeService()

      const first = await service.addCustomOrigin('https://x.example')
      const second = await service.addCustomOrigin('https://x.example')

      expect(second.corsOriginId).toBe(first.corsOriginId)
      expect(repository.save).toHaveBeenCalledTimes(1)
    })

    it('rejects malformed origins', async () => {
      const { service } = makeService()
      await expect(service.addCustomOrigin('not a url')).rejects.toThrow()
      await expect(service.addCustomOrigin('ftp://files.example.com')).rejects.toThrow()
    })

    it('serves lookups from memory: two lookups against 1000 rows in <5ms', async () => {
      const rows = Array.from({ length: 1000 }, (_, i) => ({
        corsOriginId: `uuid-${i}`,
        origin: `https://host-${i}.example.com`,
      }))
      const { service, repository } = makeService(rows)

      // Warm the cache, then the repository must not be hit again
      await service.isOriginAllowed('https://host-0.example.com')

      const start = performance.now()
      expect(await service.isOriginAllowed('https://host-500.example.com')).toBe(true)
      expect(await service.isOriginAllowed('https://host-999.example.com')).toBe(true)
      const elapsed = performance.now() - start

      expect(elapsed).toBeLessThan(5)
      expect(repository.find).toHaveBeenCalledTimes(1)
    })
  })
})

describe('normalizeOrigin', () => {
  it('keeps only the scheme, host, and port', () => {
    expect(normalizeOrigin('https://Example.COM:8123/some/path?q=1')).toBe('https://example.com:8123')
  })

  it('accepts http and https only', () => {
    expect(normalizeOrigin('http://example.com')).toBe('http://example.com')
    expect(normalizeOrigin('ftp://example.com')).toBeNull()
    expect(normalizeOrigin('file:///etc/passwd')).toBeNull()
  })

  it('rejects input that is not a URL', () => {
    expect(normalizeOrigin('not a url')).toBeNull()
    expect(normalizeOrigin('example.com')).toBeNull()
  })
})
