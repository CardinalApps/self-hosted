import { DataSource } from 'typeorm'

import { runPreSynchronizeFixups } from './data-source-factory'

// Builds a fake DataSource that records raw queries and answers the column-type lookup
const fakeDataSource = (type: string, columnRows: { data_type: string }[]) => {
  const queries: string[] = []
  return {
    queries,
    dataSource: {
      options: { type },
      query: async (sql: string) => {
        queries.push(sql)
        return columnRows
      },
    } as unknown as DataSource,
  }
}

describe('runPreSynchronizeFixups', () => {
  it('converts an integer position column in place on postgres', async () => {
    const { dataSource, queries } = fakeDataSource('postgres', [{ data_type: 'integer' }])

    await runPreSynchronizeFixups(dataSource)

    const alter = queries.find((sql) => sql.includes('ALTER TABLE'))
    expect(alter).toContain('playback_queue_item')
    expect(alter).toContain('double precision')
    expect(alter).toContain('USING')
  })

  it('does nothing when the column is already double precision', async () => {
    const { dataSource, queries } = fakeDataSource('postgres', [{ data_type: 'double precision' }])

    await runPreSynchronizeFixups(dataSource)

    expect(queries.find((sql) => sql.includes('ALTER TABLE'))).toBeUndefined()
  })

  it('does nothing when the table does not exist yet', async () => {
    const { dataSource, queries } = fakeDataSource('postgres', [])

    await runPreSynchronizeFixups(dataSource)

    expect(queries.find((sql) => sql.includes('ALTER TABLE'))).toBeUndefined()
  })

  it('does nothing on sqlite', async () => {
    const { dataSource, queries } = fakeDataSource('better-sqlite3', [{ data_type: 'integer' }])

    await runPreSynchronizeFixups(dataSource)

    expect(queries).toHaveLength(0)
  })
})
