import { DataSource } from 'typeorm'

export interface IndexShape {
  name: string
  columns: string[]
  unique: boolean
  partial: boolean
}

/**
 * Reads back the indexes that actually exist on a table, whatever created them:
 * TypeORM's synchronize (from the entity's @Index decorators) or the raw
 * statements DatabaseService runs on boot.
 *
 * SQLite only, which is all the integration harness ever boots.
 */
export async function readIndexes(dataSource: DataSource, table: string): Promise<IndexShape[]> {
  const list: { name: string, unique: number, partial: number }[] = await dataSource.query(`PRAGMA index_list('${table}')`)
  const shapes: IndexShape[] = []

  for (const index of list) {
    const info: { name: string }[] = await dataSource.query(`PRAGMA index_info('${index.name}')`)

    shapes.push({
      name: index.name,
      columns: info.map((column) => column.name),
      unique: !!index.unique,
      partial: !!index.partial,
    })
  }

  return shapes
}

/**
 * Finds the index covering exactly the given columns, in that order. Index names
 * are not asserted on because TypeORM generates its own (`IDX_<hash>`).
 */
export function findIndexOn(indexes: IndexShape[], columns: string[]): IndexShape | undefined {
  return indexes.find((index) => index.columns.length === columns.length && index.columns.every((column, i) => column === columns[i]))
}
