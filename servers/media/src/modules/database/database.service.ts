import { Injectable, Logger } from '@nestjs/common'
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'

import { Option } from './option.entity'
import { OptionsObjectType, OptionNameType, OptionValueType } from './types'

import { getSQLiteDatabaseLocation } from '../../utils/env'
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
    } else if (this?.dataSource?.options?.type === 'postgres') {
      Logger.log(`Using PostgreSQL database`, 'Database')
      Logger.log(`host=${this?.dataSource?.options?.host} port=${this?.dataSource?.options?.port} username=${this?.dataSource?.options?.username}`, 'Database')
    } else {
      Logger.error(`Invalid database configuration, got type ${this?.dataSource?.options?.type}. ${helpCode('0009')}`, 'Database')
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
