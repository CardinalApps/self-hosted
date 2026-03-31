import { Injectable, Logger } from '@nestjs/common'
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'

import { Option } from './option.entity'
import { OptionsObjectType, OptionNameType, OptionValueType } from './types'

import { getSQLiteDatabaseLocation, envVar } from '../../utils/env'
import { OPTIONS } from '../../utils/options'
import { helpCode } from '../../utils/help-codes'

@Injectable()
export class DatabaseService {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
    @InjectRepository(Option)
    private optionRepository: Repository<Option>,
  ) {}

  /**
   * When Nest starts up.
   */
  async onModuleInit(): Promise<void> {
    if (this?.dataSource?.options?.type === 'better-sqlite3') {
      Logger.log(`Using SQLite database`, 'Database')
      Logger.log(`SQLite file location: ${getSQLiteDatabaseLocation()}`, 'Database')
      await this.configureSQLite()
    } else if (this?.dataSource?.options?.type === 'postgres') {
      Logger.log(`Using PostgreSQL database`, 'Database')
      Logger.log(`host=${this?.dataSource?.options?.host} port=${this?.dataSource?.options?.port} username=${this?.dataSource?.options?.username}`, 'Database')
    } else {
      Logger.error(`Invalid database configuration, got type ${this?.dataSource?.options?.type}. ${helpCode('0009')}`, 'Database')
    }

    await this.createJunctionTableIndexes()
    await this.createPartialIndexes()
  }

  /**
   * SQLite performance pragmas. These apply to the current connection and
   * take effect immediately for all subsequent queries.
   *
   * - WAL mode:        readers never block writers and writers never block
   *                    readers, which is critical during bulk scan ingestion.
   *                    Controlled by SQLITE_WAL (default: true).
   * - synchronous:     NORMAL is safe with WAL and skips unnecessary fsyncs.
   *                    Falls back to FULL when WAL is disabled.
   * - cache_size:      64 MB page cache instead of SQLite's ~2 MB default.
   * - temp_store:      keeps sort/join temp tables in memory instead of on disk.
   * - mmap_size:       128 MB memory-mapped I/O window for read-heavy workloads.
   * - busy_timeout:    retry for up to 5 s before throwing a lock error, rather
   *                    than failing immediately under write contention.
   */
  private async configureSQLite(): Promise<void> {
    const walEnabled = envVar('SQLITE_WAL', true)

    const pragmas = [
      walEnabled ? 'PRAGMA journal_mode = WAL' : null,
      walEnabled ? 'PRAGMA synchronous = NORMAL' : 'PRAGMA synchronous = FULL',
      'PRAGMA cache_size = -64000',
      'PRAGMA temp_store = MEMORY',
      'PRAGMA mmap_size = 134217728',
      'PRAGMA busy_timeout = 5000',
    ]

    for (const pragma of pragmas.filter(Boolean)) {
      await this.dataSource.query(pragma)
    }
  }

  /**
   * Partial indexes that only cover rows where deleted_at IS NULL, matching
   * the WHERE clause TypeORM appends to every soft-delete entity query. These
   * stay smaller and faster than the full indexes as soft-deleted rows
   * accumulate over time, and the query planner will prefer them for the
   * common case where deleted rows are excluded.
   */
  private async createPartialIndexes(): Promise<void> {
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_file_active_absolute_path
         ON file (absolute_path) WHERE deleted_at IS NULL`,
      `CREATE INDEX IF NOT EXISTS idx_music_track_active_release_id
         ON music_track (release_id) WHERE deleted_at IS NULL`,
      `CREATE INDEX IF NOT EXISTS idx_music_track_active_title
         ON music_track (title) WHERE deleted_at IS NULL`,
      `CREATE INDEX IF NOT EXISTS idx_music_release_active_title
         ON music_release (title) WHERE deleted_at IS NULL`,
      `CREATE INDEX IF NOT EXISTS idx_music_artist_active_name
         ON music_artist (name) WHERE deleted_at IS NULL`,
    ]

    for (const sql of indexes) {
      await this.dataSource.query(sql)
    }
  }

  /**
   * TypeORM's synchronize creates a composite PK on junction tables but only
   * covers lookups from the owner side. These indexes cover the inverse
   * direction, e.g. "get all tracks for an artist" or "get all artists for a
   * release".
   */
  private async createJunctionTableIndexes(): Promise<void> {
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_music_track_artists_music_artist_id
         ON music_track_artists_music_artist (music_artist_id)`,
      `CREATE INDEX IF NOT EXISTS idx_music_artist_releases_music_release_id
         ON music_artist_releases_music_release (music_release_id)`,
    ]

    for (const sql of indexes) {
      await this.dataSource.query(sql)
    }
  }

  /**
   * Create or update a single option in the options table.
   */
  async saveOption(name: OptionNameType, value: OptionValueType): Promise<Option> {
    const update = <Option>{
      name,
      value: value.toString(),
    }

    const optionInDb = await this.optionRepository.findOneBy({ name })

    if (optionInDb) {
      update.id = optionInDb.id
    }

    return await this.optionRepository.save(update)
  }

  /**
   * Create or update multiple options in the options table.
   */
  async saveOptions(options: OptionsObjectType): Promise<Option[]> {
    const saved = []
    for (const [name, value] of Object.entries(options)) {
      saved.push(await this.saveOption(name, value.toString()))
    }
    return saved
  }

  /**
   * Get an option from the options table.
   */
  async getOption(name: string): Promise<OptionValueType> {
    const found = await this.optionRepository.findOneBy({ name })

    if (found === null) {
      return null
    }

    if (found.value === 'true') {
      return true
    } else if (found.value === 'false') {
      return false
    } else if (found.value === 'null') {
      return null
    } else if (found.value === 'undefined') {
      return undefined
    } else {
      return found.value
    }
  }

  /**
   * Returns the current version of the database.
   */
  async getVersion(): Promise<OptionValueType> {
    return await this.getOption(OPTIONS.DATABASE_VERSION.name)
  }

  /**
   * Checks if the first time setup of the server has already been completed.
   */
  async isFirstTimeSetupDone(): Promise<boolean> {
    return !!await this.getOption(OPTIONS.FIRST_TIME_SETUP_DONE.name)
  }
}
