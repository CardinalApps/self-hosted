import { getDataSourceToken } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'

import { createTestApp, destroyTestApp, TestApp } from '../../helpers/create-app'
import { readIndexes, findIndexOn } from '../../helpers/indexes'

let testApp: TestApp
let dataSource: DataSource

/*
  The integration harness only ever boots SQLite, so the indexes are read back
  through PRAGMA. The Postgres path is covered by construction rather than by
  assertion: DatabaseService.onModuleInit calls createPartialIndexes for every
  engine, and TypeORM's synchronize emits the entity-declared indexes for every
  engine, so an index proven present here is created by the same call on Postgres.
*/
beforeAll(async () => {
  testApp = await createTestApp()
  dataSource = testApp.moduleRef.get(getDataSourceToken())
})

afterAll(async () => {
  await destroyTestApp(testApp)
})

describe('photo table indexes', () => {
  it('indexes photo_id uniquely, because it is the public lookup key', async () => {
    const index = findIndexOn(await readIndexes(dataSource, 'photo'), ['photo_id'])

    expect(index).toBeDefined()
    expect(index.unique).toBe(true)
  })

  it('indexes taken_at, the default sort column for photo listings', async () => {
    expect(findIndexOn(await readIndexes(dataSource, 'photo'), ['taken_at'])).toBeDefined()
  })

  it('indexes taken_on_day, the grouping key for day-based views', async () => {
    expect(findIndexOn(await readIndexes(dataSource, 'photo'), ['taken_on_day'])).toBeDefined()
  })

  it('makes the taken_at and taken_on_day indexes partial on the soft-delete predicate', async () => {
    const indexes = await readIndexes(dataSource, 'photo')

    expect(findIndexOn(indexes, ['taken_at']).partial).toBe(true)
    expect(findIndexOn(indexes, ['taken_on_day']).partial).toBe(true)
  })
})

describe('photo_album_entry table indexes', () => {
  it('indexes photo_album_id, for listing the entries of an album', async () => {
    expect(findIndexOn(await readIndexes(dataSource, 'photo_album_entry'), ['photo_album_id'])).toBeDefined()
  })

  it('indexes photo_id, for listing the albums a photo belongs to', async () => {
    expect(findIndexOn(await readIndexes(dataSource, 'photo_album_entry'), ['photo_id'])).toBeDefined()
  })
})
