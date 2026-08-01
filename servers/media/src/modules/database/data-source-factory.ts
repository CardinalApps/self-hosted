/**
 * @file - To readers of this particular file: yes I know this is code smell.
 * This will be removed when synchronize is dropped and replaced with
 * migrations. Pinky promise.
 */

import { Logger } from '@nestjs/common'
import { DataSource, DataSourceOptions } from 'typeorm'

/**
 * Creates the app's DataSource, deferring TypeORM's synchronize until after the
 * pre-synchronize fixups have run. Plugged into TypeOrmModule as its dataSourceFactory,
 * so Nest's connection retry behavior still applies to everything in here.
 */
export async function createDataSource(options: DataSourceOptions): Promise<DataSource> {
  const dataSource = new DataSource({ ...options, synchronize: false } as DataSourceOptions)
  await dataSource.initialize()

  await runPreSynchronizeFixups(dataSource)

  if (options.synchronize) {
    await dataSource.synchronize()
  }

  return dataSource
}

/**
 * Raw-SQL repairs for entity changes that synchronize cannot apply to a database that
 * already has data. Runs on every boot, before synchronize, so every fixup must be
 * idempotent and must no-op on fresh databases.
 */
export async function runPreSynchronizeFixups(dataSource: DataSource): Promise<void> {
  await convertQueueItemPositionToDouble(dataSource)
}

/**
 * `playback_queue_item.position` changed from integer to double precision when queue
 * positions became fractional. TypeORM applies a type change by dropping and re-adding
 * the column, which Postgres rejects on a non-empty table (the re-added NOT NULL column
 * has no values for the existing rows), leaving the server unable to boot - and even on
 * an empty table it would discard the stored positions. Converting the column in place
 * keeps the values and lets synchronize find the type it expects.
 *
 * SQLite doesn't need this fixup: TypeORM rebuilds SQLite tables by copying rows into a
 * new table, which carries the position values over.
 */
async function convertQueueItemPositionToDouble(dataSource: DataSource): Promise<void> {
  if (dataSource.options.type !== 'postgres') {
    return
  }

  const columns = await dataSource.query(
    `SELECT data_type FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = 'playback_queue_item'
       AND column_name = 'position'`,
  )

  if (!columns.length || columns[0].data_type === 'double precision') {
    return
  }

  Logger.log(`Converting playback_queue_item.position from ${columns[0].data_type} to double precision`, 'Database')

  await dataSource.query(
    `ALTER TABLE "playback_queue_item"
     ALTER COLUMN "position" TYPE double precision USING "position"::double precision`,
  )
}
