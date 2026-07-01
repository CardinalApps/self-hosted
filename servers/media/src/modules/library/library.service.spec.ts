import { LibraryService } from './library.service'
import { Library } from './library.entity'

// createJoinArgs only reads its argument (and the CARDINAL_POSTGRES env flag),
// so it can be exercised without the service's injected dependencies.
const service = Object.create(LibraryService.prototype) as LibraryService

const lib = (paths: string[]): Library => ({ paths } as Library)

describe('LibraryService.createJoinArgs', () => {
  it('matches no rows when there are no paths (unknown/empty library)', () => {
    expect(service.createJoinArgs([])).toEqual(['file', '1 = 0', {}])
    expect(service.createJoinArgs([lib([])])).toEqual(['file', '1 = 0', {}])
  })

  it('builds a prefix LIKE clause per path (SQLite)', () => {
    const [alias, condition, params] = service.createJoinArgs([lib(['/music/Classical']), lib(['/music/Jazz'])])
    expect(alias).toBe('file')
    expect(condition).toContain('file.absolutePath LIKE :p0')
    expect(condition).toContain('file.absolutePath LIKE :p1')
    expect(condition).toContain(' OR ')
    expect(params).toEqual({ p0: '/music/Classical%', p1: '/music/Jazz%' })
  })
})
