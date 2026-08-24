import * as os from 'os'
import * as path from 'path'
import * as Database from 'better-sqlite3'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { createTestApp, destroyTestApp, TestApp } from '../../helpers/create-app'
import { PlaybackQueueItem } from '../../../src/modules/playback-queue/playback-queue-item.entity'

let testApp: TestApp

/*
  Boots the server against a database created by an older release, where
  playback_queue_item.position was still an integer column and rows already exist.
  Guards the upgrade path that crash-looped 0.8.0 on Postgres: schema sync must not
  reject the populated table, and the stored positions must survive the type change.
*/
beforeAll(async () => {
  const dbPath = path.join(os.tmpdir(), `cardinal-upgrade-test-${process.pid}-${Date.now()}.sqlite3`)

  const db = new Database(dbPath)
  db.exec(`
    CREATE TABLE "playback_queue_item" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "created_at" datetime NOT NULL DEFAULT (datetime('now')),
      "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
      "deleted_at" datetime,
      "queue_item_id" varchar NOT NULL,
      "media_type" varchar NOT NULL,
      "media_id" varchar NOT NULL,
      "position" integer NOT NULL,
      "queue_id" integer
    )
  `)
  const insert = db.prepare(`
    INSERT INTO "playback_queue_item" ("queue_item_id", "media_type", "media_id", "position")
    VALUES (?, 'music_track', ?, ?)
  `)
  for (let position = 1; position <= 3; position++) {
    insert.run(`queue-item-${position}`, `track-${position}`, position)
  }
  db.close()

  testApp = await createTestApp(dbPath)
})

afterAll(async () => {
  await destroyTestApp(testApp)
})

describe('booting against a pre-fractional-position database', () => {
  it('keeps the existing queue item positions through schema sync', async () => {
    const items: Repository<PlaybackQueueItem> = testApp.moduleRef.get(getRepositoryToken(PlaybackQueueItem))

    const rows = await items.find({ order: { position: 'asc' } })

    expect(rows).toHaveLength(3)
    expect(rows.map((row) => row.position)).toEqual([1, 2, 3])
    expect(rows.map((row) => row.queueItemId)).toEqual(['queue-item-1', 'queue-item-2', 'queue-item-3'])
  })
})
