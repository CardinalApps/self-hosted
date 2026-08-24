import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { getDefaultSettings, getScopedSlugs, getStoredSlugs } from '@cardinalapps/app-settings/dist/cjs'

import { Setting } from './setting.entity'
import { SettingsEvents } from './events'
import { SettingName, SettingValue, SettingsObject } from './types'

import { EventService } from '../event/event.service'
import { CardinalApp } from '../../utils/apps'

// The `app` value for settings that apply to every Cardinal app
export const GLOBAL_APP = 'global'

// The `userId` value for settings that belong to the server rather than a user
export const SERVER_USER_ID = ''

// Slugs stored per account. They are shared across apps, so they live under GLOBAL_APP.
const userScopedSlugs = getScopedSlugs('en', 'user')

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Setting)
    private settingRepository: Repository<Setting>,
    private readonly eventService: EventService,
  ) {}

  // The server only persists home_server settings; client-stored settings live
  // in the browser and never round-trip through the database. User-scoped
  // settings are excluded too: they belong to an account, so there is nothing
  // sensible to seed them with before anyone has signed in.
  defaultSettings = {
    [CardinalApp.ADMIN]: this.serverDefaults(CardinalApp.ADMIN),
    [CardinalApp.MUSIC]: this.serverDefaults(CardinalApp.MUSIC),
    [CardinalApp.PHOTOS]: this.serverDefaults(CardinalApp.PHOTOS),
    [CardinalApp.CINEMA]: this.serverDefaults(CardinalApp.CINEMA),
  }

  // The app's home_server defaults, minus anything stored per account
  private serverDefaults(app: CardinalApp): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(getDefaultSettings(app, 'en', 'home_server'))
        .filter(([name]) => !userScopedSlugs.includes(name)),
    )
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
   *
   * User-scoped settings ignore `app` entirely and are written once against the
   * signed-in account, so they follow that user into every Cardinal app. Saving
   * one without a `userId` is a no-op rather than a server-wide write, so a
   * missing user can never leak one account's preferences to everybody.
   */
  async set(
    app: CardinalApp | null,
    settings: SettingsObject,
    userId?: string,
  ): Promise<Partial<Setting>[] | null> {
    const appsToUpdate = app === null
      ? [CardinalApp.ADMIN, CardinalApp.MUSIC, CardinalApp.PHOTOS, CardinalApp.CINEMA]
      : [app]
    const entities: Partial<Setting>[] = []

    Object.keys(settings)
      .filter((name) => userScopedSlugs.includes(name))
      .forEach((name) => {
        if (!userId) {
          return
        }

        entities.push({
          app: GLOBAL_APP,
          userId,
          name,
          value: settings[name] as string,
        })
      })

    appsToUpdate.forEach((app) => {
      // Drop any client-stored settings; they belong in the browser, not the db.
      const clientSlugs = getStoredSlugs(app, 'en', 'client')

      Object.keys(settings)
        .filter((name) => !clientSlugs.includes(name) && !userScopedSlugs.includes(name))
        .forEach((name) => {
          entities.push({
            app: app,
            userId: SERVER_USER_ID,
            name: name,
            value: settings[name] as string,
          })
        })
    })

    if (!entities.length) {
      return entities
    }

    /*
     * Written row by row rather than with a batched upsert. TypeORM's upsert leans on ON CONFLICT
     * against the unique index, and a batch that mixes new and existing rows comes back with
     * misaligned ids once the conflict target includes the defaulted userId column. Settings are
     * written a handful of rows at a time, so the extra queries cost nothing and this behaves the
     * same on SQLite and Postgres.
     */
    try {
      for (const entity of entities) {
        const existing = await this.settingRepository.findOneBy({
          app: entity.app,
          name: entity.name,
          userId: entity.userId,
        })

        if (existing) {
          await this.settingRepository.update(existing.id, { value: entity.value })
        } else {
          await this.settingRepository.insert(entity)
        }
      }

      // Lets modules act on a setting the moment it changes rather than at the next restart
      this.eventService.emitPrivate(SettingsEvents.CHANGED, {
        names: [...new Set(entities.map((entity) => entity.name))],
      })

      return entities
    } catch (error) {
      Logger.error(error)
      return null
    }
  }

  /**
   * Get a server-wide setting and its current value.
   */
  async get(app: CardinalApp, name: SettingName): Promise<SettingValue | null> {
    let found = null

    try {
      found = await this.settingRepository.findOneBy({ app, name, userId: SERVER_USER_ID })
    } catch (error) {
      Logger.error(error, 'Settings')
    }

    return found?.value ?? null
  }

  /**
   * Get all of the saved settings for an app, resolved for the given user.
   *
   * Least to most specific: server-wide globals, then server-wide app settings,
   * then the user's own settings. Omitting `userId` returns just the
   * server-wide values.
   */
  async getAppSettings(app: CardinalApp, userId?: string): Promise<SettingsObject | null> {
    try {
      const globalSettings = await this.settingRepository.findBy({
        app: GLOBAL_APP,
        userId: SERVER_USER_ID,
      })
      const appSettings = await this.settingRepository.findBy({ app, userId: SERVER_USER_ID })
      const userSettings = userId
        ? await this.settingRepository.findBy({ app: GLOBAL_APP, userId })
        : []
      const resolvedSettings = {}

      /*
       * Server-wide rows can never supply a user-scoped setting. Databases from before these
       * settings moved to the server still hold rows for them, and serving those would hand every
       * account a value that was never theirs - an empty custom_themes string, for instance.
       */
      const applyServerWide = (settings: Setting[]) => settings.forEach((setting) => {
        if (!userScopedSlugs.includes(setting.name)) {
          resolvedSettings[setting.name] = setting.value
        }
      })

      applyServerWide(globalSettings)
      applyServerWide(appSettings)

      userSettings.forEach((setting) => {
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
