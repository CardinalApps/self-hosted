import * as os from 'os'
import * as path from 'path'
import * as Database from 'better-sqlite3'
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'

import { createTestApp, destroyTestApp, TestApp } from '../../helpers/create-app'
import { readIndexes, findIndexOn } from '../../helpers/indexes'
import { Photo } from '../../../src/modules/photo/photo.entity'

let testApp: TestApp
let dataSource: DataSource

const seededPhotoIds = [
  'a2e1b0c4-1111-4aaa-8000-000000000001',
  'a2e1b0c4-2222-4aaa-8000-000000000002',
  'a2e1b0c4-3333-4aaa-8000-000000000003',
]

/*
  photo.photo_id is unique in the entity, so synchronize adds a UNIQUE index to
  databases that already hold photos. That statement fails on duplicate values,
  and a failing boot is a crash loop, so this guards the upgrade.

  The old schema is produced by booting the current one and dropping the index
  again, rather than by hand-writing a legacy CREATE TABLE that would drift.
*/
beforeAll(async () => {
  const dbPath = path.join(os.tmpdir(), `cardinal-photo-index-upgrade-${process.pid}-${Date.now()}.sqlite3`)

  const seedApp = await createTestApp(dbPath)
  const photos: Repository<Photo> = seedApp.moduleRef.get(getRepositoryToken(Photo))
  await photos.save(seededPhotoIds.map((photoId) => ({ photoId })))
  await seedApp.app.close()

  const db = new Database(dbPath)
  const legacy = db.prepare(`SELECT name, sql FROM sqlite_master WHERE type = 'index' AND tbl_name = 'photo'`).all() as { name: string, sql: string }[]
  const uniqueOnPhotoId = legacy.find((index) => index.sql?.includes('UNIQUE') && index.sql?.includes('"photo_id"'))
  db.exec(`DROP INDEX "${uniqueOnPhotoId.name}"`)
  db.close()

  testApp = await createTestApp(dbPath)
  dataSource = testApp.moduleRef.get(getDataSourceToken())
})

afterAll(async () => {
  if (testApp) {
    await destroyTestApp(testApp)
  }
})

describe('booting against a database whose photo table predates the unique photo_id index', () => {
  it('adds the unique index during schema sync', async () => {
    const index = findIndexOn(await readIndexes(dataSource, 'photo'), ['photo_id'])

    expect(index).toBeDefined()
    expect(index.unique).toBe(true)
  })

  it('keeps the existing photos and their IDs', async () => {
    const photos: Repository<Photo> = testApp.moduleRef.get(getRepositoryToken(Photo))

    const rows = await photos.find({ order: { id: 'asc' } })

    expect(rows.map((row) => row.photoId)).toEqual(seededPhotoIds)
  })
})
