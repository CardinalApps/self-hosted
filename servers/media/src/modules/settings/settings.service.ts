import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { getDefaultSettings } from '@cardinalapps/app-settings/dist/cjs'

import { Setting } from './setting.entity'
import { SettingName, SettingValue, SettingsObject } from './types'

import { CardinalApp } from '../../utils/apps'

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Setting)
    private settingRepository: Repository<Setting>,
  ) {}

  defaultSettings = {
    [CardinalApp.ADMIN]: getDefaultSettings(CardinalApp.ADMIN, 'en'),
    [CardinalApp.MUSIC]: getDefaultSettings(CardinalApp.MUSIC, 'en'),
    [CardinalApp.PHOTOS]: getDefaultSettings(CardinalApp.PHOTOS, 'en'),
    [CardinalApp.CINEMA]: getDefaultSettings(CardinalApp.CINEMA, 'en'),
  }

  /**
   * When Nest starts up.
   */
  async onModuleInit(): Promise<void> {
    await await this.ensureDefaultAppSettings()
  }

  /**
   * Create or update one or more settings. Set `app` to `null` to have the
   * setting apply to all apps.
   */
  async set(app: CardinalApp | null, settings: SettingsObject): Promise<Partial<Setting>[] | null> {
    const appsToUpdate = app === null
      ? [CardinalApp.ADMIN, CardinalApp.MUSIC, CardinalApp.PHOTOS, CardinalApp.CINEMA]
      : [app]
    const entities: Partial<Setting>[] = []

    appsToUpdate.forEach((app) => {
      Object.keys(settings).map((name) => {
        entities.push({
          app: app,
          name: name,
          value: settings[name].toString(),
        })
      })
    })

    try {
      await this.settingRepository.upsert(entities, ['app', 'name'])
      return entities
    } catch (error) {
      Logger.error(error)
      return null
    }
  }

  /**
   * Get a setting and its current value.
   */
  async get(app: CardinalApp, name: SettingName): Promise<SettingValue | null> {
    let found = null

    try {
      found = await this.settingRepository.findOneBy({ app, name })
    } catch (error) {
      Logger.error(error, 'Settings')
    }

    return found.value
  }

  /**
   * Get all of the saved settings for an app.
   */
  async getAppSettings(app: CardinalApp): Promise<SettingsObject | null> {
    // Specific app settings should overwrite global settings
    try {
      const globalSettings = await this.settingRepository.findBy({ app: 'global' })
      const appSettings = await this.settingRepository.findBy({ app })
      const resolvedSettings = {}

      globalSettings.forEach((setting) => {
        resolvedSettings[setting.name] = setting.value
      })

      appSettings.forEach((setting) => {
        resolvedSettings[setting.name] = setting.value
      })

      return resolvedSettings
    } catch (error) {
      Logger.error(error, 'Settings')
    }

    return null
  }

  /**
   * Ensures that the required app settings exist in the database.
   */
  async ensureDefaultAppSettings(): Promise<void> {
    const settingsInDb = {}
    settingsInDb[CardinalApp.ADMIN] = await this.getAppSettings(CardinalApp.ADMIN)
    settingsInDb[CardinalApp.MUSIC] = await this.getAppSettings(CardinalApp.MUSIC)
    settingsInDb[CardinalApp.PHOTOS] = await this.getAppSettings(CardinalApp.PHOTOS)
    settingsInDb[CardinalApp.CINEMA] = await this.getAppSettings(CardinalApp.CINEMA)

    const missingSettings = {
      [CardinalApp.ADMIN]: {},
      [CardinalApp.MUSIC]: {},
      [CardinalApp.PHOTOS]: {},
      [CardinalApp.CINEMA]: {},
    }

    // Check if all default settings currently exist in the db
    for (const [app, defaultSettings] of Object.entries(this.defaultSettings)) {
      for (const [name, value] of Object.entries(defaultSettings)) {
        if (!(name in settingsInDb[app])) {
          missingSettings[app][name] = value
        }
      }
    }

    for (const [app, settingsToFill] of Object.entries(missingSettings)) {
      if (Object.keys(settingsToFill).length) {
        try {
          await this.set(app as CardinalApp, settingsToFill)
          Object.keys(settingsToFill).forEach((setting) => {
            Logger.log(`Set default setting for app (${app}) [${setting}=${this.defaultSettings[app][setting]}]`, 'Settings')
          })
        } catch (error) {
          Logger.error('Error saving default settings on startup', 'Settings')
        }
      }
    }
  }
}
