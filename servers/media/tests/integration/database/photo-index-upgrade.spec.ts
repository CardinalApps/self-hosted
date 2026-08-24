import * as os from 'os'
import * as path from 'path'
import * as Database from 'better-sqlite3'
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'

import { createTestApp, destroyTestApp, TestApp } from '../../helpers/create-app'
import { readIndexes, findIndexOn } from '../../helpers/indexes'
import { Photo } from '../../../src/modules/photo/photo.entity'
import { PhotoAlbum } from '../../../src/modules/photo-album/photo-album.entity'
import { PhotoAlbumEntry } from '../../../src/modules/photo-album/photo-album-entry.entity'

let testApp: TestApp
let dataSource: DataSource

const seededPhotoIds = [
  'a2e1b0c4-1111-4aaa-8000-000000000001',
  'a2e1b0c4-2222-4aaa-8000-000000000002',
  'a2e1b0c4-3333-4aaa-8000-000000000003',
]

const seededPhotoAlbumIds = [
  'b3f2c1d5-1111-4bbb-8000-000000000001',
  'b3f2c1d5-2222-4bbb-8000-000000000002',
]

const seededPhotoAlbumEntryIds = [
  'c4a3d2e6-1111-4ccc-8000-000000000001',
  'c4a3d2e6-2222-4ccc-8000-000000000002',
  'c4a3d2e6-3333-4ccc-8000-000000000003',
]

/**
 * Drops the UNIQUE index TypeORM created for a column, putting the table back
 * into the shape it had before the column was declared unique.
 */
function dropUniqueIndexOn(db: Database.Database, table: string, column: string): void {
  const indexes = db.prepare(`SELECT name, sql FROM sqlite_master WHERE type = 'index' AND tbl_name = ?`).all(table) as { name: string, sql: string }[]
  const unique = indexes.find((index) => index.sql?.includes('UNIQUE') && index.sql?.includes(`"${column}"`))

  if (!unique) {
    throw new Error(`Cannot stage the pre-index database: ${table}.${column} has no unique index to drop.`)
  }

  db.exec(`DROP INDEX "${unique.name}"`)
}

/*
  The public UUID columns are unique in the entities, so synchronize adds a
  UNIQUE index to databases that already hold photos, albums and album entries.
  That statement fails on duplicate values, and a failing boot is a crash loop,
  so this guards the upgrade.

  The old schema is produced by booting the current one and dropping the indexes
  again, rather than by hand-writing a legacy CREATE TABLE that would drift.
*/
beforeAll(async () => {
  const dbPath = path.join(os.tmpdir(), `cardinal-photo-index-upgrade-${process.pid}-${Date.now()}.sqlite3`)

  const seedApp = await createTestApp(dbPath)
  const photos: Repository<Photo> = seedApp.moduleRef.get(getRepositoryToken(Photo))
  const albums: Repository<PhotoAlbum> = seedApp.moduleRef.get(getRepositoryToken(PhotoAlbum))
  const entries: Repository<PhotoAlbumEntry> = seedApp.moduleRef.get(getRepositoryToken(PhotoAlbumEntry))

  const savedPhotos = await photos.save(seededPhotoIds.map((photoId) => ({ photoId })))
  const savedAlbums = await albums.save(seededPhotoAlbumIds.map((photoAlbumId, i) => ({ photoAlbumId, name: `Album ${i}` })))
  await entries.save(seededPhotoAlbumEntryIds.map((photoAlbumEntryId, i) => ({
    photoAlbumEntryId,
    photo: savedPhotos[i],
    photoAlbum: savedAlbums[i % savedAlbums.length],
  })))

  await seedApp.app.close()

  const db = new Database(dbPath)
  dropUniqueIndexOn(db, 'photo', 'photo_id')
  dropUniqueIndexOn(db, 'photo_album', 'photo_album_id')
  dropUniqueIndexOn(db, 'photo_album_entry', 'photo_album_entry_id')
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

describe('booting against a database whose photo_album table predates the unique photo_album_id index', () => {
  it('adds the unique index during schema sync', async () => {
    const index = findIndexOn(await readIndexes(dataSource, 'photo_album'), ['photo_album_id'])

    expect(index).toBeDefined()
    expect(index.unique).toBe(true)
  })

  it('keeps the existing albums and their IDs', async () => {
    const albums: Repository<PhotoAlbum> = testApp.moduleRef.get(getRepositoryToken(PhotoAlbum))

    const rows = await albums.find({ order: { id: 'asc' } })

    expect(rows.map((row) => row.photoAlbumId)).toEqual(seededPhotoAlbumIds)
  })
})

describe('booting against a database whose photo_album_entry table predates the unique photo_album_entry_id index', () => {
  it('adds the unique index during schema sync', async () => {
    const index = findIndexOn(await readIndexes(dataSource, 'photo_album_entry'), ['photo_album_entry_id'])

    expect(index).toBeDefined()
    expect(index.unique).toBe(true)
  })

  it('keeps the existing entries, their IDs, and the rows they point at', async () => {
    const entries: Repository<PhotoAlbumEntry> = testApp.moduleRef.get(getRepositoryToken(PhotoAlbumEntry))

    const rows = await entries.find({ order: { id: 'asc' }, relations: { photo: true, photoAlbum: true } })

    expect(rows.map((row) => row.photoAlbumEntryId)).toEqual(seededPhotoAlbumEntryIds)
    expect(rows.map((row) => row.photo.photoId)).toEqual(seededPhotoIds)
    expect(rows.map((row) => row.photoAlbum.photoAlbumId)).toEqual([
      seededPhotoAlbumIds[0],
      seededPhotoAlbumIds[1],
      seededPhotoAlbumIds[0],
    ])
  })
})
