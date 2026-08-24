import { getDataSourceToken } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'

import { createTestApp, destroyTestApp, TestApp } from '../../helpers/create-app'

let testApp: TestApp
let dataSource: DataSource

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

/*
  The album public UUID columns are minted by the database, matching the music
  entities, so a write that omits the column still produces a usable public ID
  instead of failing the NOT NULL constraint. The insert is raw SQL because that
  is the only way to bypass the service layer that always supplies a value.

  SQLite only, which is all the integration harness ever boots; the Postgres
  default (gen_random_uuid()) comes from the same decorator.
*/
beforeAll(async () => {
  testApp = await createTestApp()
  dataSource = testApp.moduleRef.get(getDataSourceToken())
})

afterAll(async () => {
  await destroyTestApp(testApp)
})

describe('album public UUID columns default to a database-generated UUID', () => {
  it('mints photo_album_id when the writer omits it', async () => {
    await dataSource.query(`INSERT INTO photo_album (name) VALUES ('minted-by-the-database')`)

    const [row] = await dataSource.query(`SELECT photo_album_id FROM photo_album WHERE name = 'minted-by-the-database'`)

    expect(row.photo_album_id).toMatch(UUID_V4)
  })

  it('mints photo_album_entry_id when the writer omits it', async () => {
    await dataSource.query(`INSERT INTO photo_album_entry DEFAULT VALUES`)

    const [row] = await dataSource.query(`SELECT photo_album_entry_id FROM photo_album_entry`)

    expect(row.photo_album_entry_id).toMatch(UUID_V4)
  })
})
