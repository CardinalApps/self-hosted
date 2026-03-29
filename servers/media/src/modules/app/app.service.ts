import * as fs from 'fs'
import * as path from 'path'
import * as worker_threads from 'worker_threads'
import { Injectable, Logger } from '@nestjs/common'
import { differenceInDays, isValid } from 'date-fns'
import * as ms from 'ms'
import * as semver from 'semver'
import { v4 as uuid } from 'uuid'

import { DatabaseService } from '../database/database.service'
import { UserService } from '../user/user.service'
import { AuthService } from '../auth/auth.service'
import { SettingsService } from '../settings/settings.service'
import { IndexingService } from '../indexing/indexing.service'
import { JobService } from '../job/job.service'
import { EventService } from '../event/event.service'

import {
  ServerInitType,
  ServerInitResultType,
  HomeServerAge,
  LsWorkerInput,
  LsWorkerOutput,
} from './types'
import { AppEvents } from './events'

import { OPTIONS } from '../../utils/options'
import { CardinalApp } from '../../utils/apps'
import { envVar, getPublicDir } from '../../utils/env'
import { websiteAPI, LatestRelease } from '../../utils/cloud'
import { ReleaseChannels } from '../../utils/releaseChannels'

// TODO make this a user configurable option
const AUTO_CHECK_FOR_UPDATES_FREQUENCY = ms('4 hours')

@Injectable()
export class AppService {
  constructor(
    private databaseService: DatabaseService,
    private userService: UserService,
    private authService: AuthService,
    private settingsService: SettingsService,
    private indexingService: IndexingService,
    private jobService: JobService,
    private eventService: EventService,
  ) {}

  /**
   * When Nest starts up.
   */
  async onModuleInit(): Promise<void> {
    this.ensureInstallationDate()
    this.ensureInstanceId()
  }

  /**
   * Returns the date that Cardinal Media Server was first installed.
   */
  async getInstallationDate(): Promise<Date | null> {
    const value = await this.databaseService.getOption(OPTIONS.INSTALLED_AT.name)

    if (value) {
      return new Date(value as string)
    } else {
      return null
    }
  }

  /**
   * Checks if there is an installation date saved in the database, and if not,
   * sets it.
   * 
   * This should only ever run once, on the first ever startup.
   */
  async ensureInstallationDate(): Promise<void> {
    if (!await this.getInstallationDate()) {
      const installationDate = new Date().toString()
      this.databaseService.saveOption(OPTIONS.INSTALLED_AT.name, installationDate)
      Logger.log(`Set installation date: ${installationDate}`, 'App')
    }
  }

  /**
   * Checks if there is an instance ID saved in database, and if not,
   * sets it.
   */
  async ensureInstanceId(): Promise<void> {
    const instanceId = await this.databaseService.getOption(OPTIONS.INSTANCE_ID.name)
    if (!instanceId) {
      const instanceId = uuid()
      await this.databaseService.saveOption(OPTIONS.INSTANCE_ID.name, instanceId)
      Logger.log(`Set instance ID: ${instanceId}`, 'App')
    }
  }

  /**
   * Returns the version of the Cardinal Media Server *server*.
   */
  getHomeServerVersion(): string {
    if (process?.env?.npm_package_version) {
      return process.env.npm_package_version
    }

    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', 'package.json'), 'utf8'))
      return pkg?.version || 'Unknown'
    } catch (error) {
      Logger.error('Could not read web app package.json file.')
      console.error(error)
      return 'Unknown'
    }
  }

  /**
   * Returns the version of one of the web apps.
   */
  getWebAppVersion(app: CardinalApp): string {
    let publicDir: string = app

    if (app === CardinalApp.ADMIN) {
      publicDir = 'admin'
    }

    try {
      const pkg = JSON.parse(fs.readFileSync(getPublicDir(publicDir, 'package.json'), 'utf8'))
      return pkg?.version || 'Unknown'
    } catch (error) {
      Logger.error('Could not read web app package.json file.')
      console.error(error)
      return 'Unknown'
    }
  }

  /**
   * Returns an array of public API endpoints meant to be seen by the user that
   * is self-hosting this.
   * 
   * The list is filtered down to just the endpoints with a version number so
   * that endpoints for static assets are excluded, which the user doesn't care
   * about anyway.
   */
  getPubliclyListedAPIEndpoints(stack): string[] {
    return stack
      .map((layer) => {
        if (layer.route) {
          return `${layer.route?.stack[0].method.toUpperCase()} ${layer.route?.path}`
        }
      })
      // TODO make this a regex that filters our all non-versioned endpoints
      .filter((item) => item !== undefined && (item?.includes('v1/') || item?.includes('v2/') || item?.includes('v3/')))
      .sort((a, b) => a < b ? -1 : 1)
  }

  /**
   * Checks if the server has already gone through the first time setup.
   */
  async isServerSetup(): Promise<boolean> {
    return await this.databaseService.isFirstTimeSetupDone()
  }

  /**
   * Handles the initial server setup.
   */
  async initialSetup(setupData: ServerInitType): Promise<ServerInitResultType | false> {
    // All of these should be set to true by the end of this method
    const setupStageSuccess = {
      optionsTable: false,
      settingsTable: false,
      initialUser: false,
    }

    // The client will do another request later to log into this account
    let accountToLogInto

    // The user can optionally log into a Cardinal account during first time
    // setup - if they do, create and link their home server account.
    if (setupData.userCardinalJWT) {
      // Sanity check
      if (await this.userService.getServerOwner()) {
        Logger.warn("First time setup wanted to claim the server but it seems like it's already been claimed. Proceeding without changing owners.")
        setupStageSuccess.initialUser = true
      } else {
        try {
          const newServerOwner = await this.userService.createServerOwner(setupData.userCardinalJWT, setupData.serverName)
          accountToLogInto = newServerOwner.userId
          setupStageSuccess.initialUser = true
        } catch (error) {
          Logger.error(error, 'FirstTimeSetup')
          setupStageSuccess.initialUser = false
        }
      }
    }
    // If they opted to not log into a cloud account, log them into the guest account
    else {
      try {
        const guestAccount = await this.userService.getGuestAccount()
        accountToLogInto = guestAccount.userId
        setupStageSuccess.initialUser = true
      } catch (error) {
        setupStageSuccess.initialUser = false
      }
    }

    // Initialize the option table
    try {
      const savedOptions = await this.databaseService.saveOptions({
        [OPTIONS.FIRST_TIME_SETUP_DONE.name]: true,
      })
      setupStageSuccess.optionsTable = savedOptions.every((opt) => !!opt.id)
    } catch (error) {
      // noop
    }

    // Initialize the settings table
    try {
      const savedSettings = await this.settingsService.set(CardinalApp.ADMIN, {
        theme: setupData?.theme,
        server_name: setupData.serverName,
        telemetry: setupData?.sendAnonymousUsageData,
      })
      setupStageSuccess.settingsTable = !!savedSettings.length
    } catch (error) {
      // noop
    }

    // All stages successful
    if (Object.values(setupStageSuccess).every((result) => !!result)) {
      this.eventService.emitPrivate(AppEvents.FIRST_TIME_SETUP_SUCCESS)
      return {
        serverName: setupData.serverName,
        accountToLogInto,
      }
    } else {
      return false
    }
  }

  /**
   * Resets all media data.
   */
  async resetMediaData(): Promise<boolean> {
    // Sequential: job_task has a FK to file, so jobs must be cleared before indexed data
    const results = [
      await this.jobService.deleteAllJobs(),
      await this.indexingService.deleteAllIndexedData(),
    ]

    const success = results.every((result) => result === true)

    if (success) {
      this.eventService.emitPublic(AppEvents.DEINDEX_ALL_MEDIA_SUCCESS)
    }

    return success
  }

  /**
   * Performs a factory reset of the server.
   */
  async factoryReset(): Promise<boolean> {
    const serverOwner = await this.userService.getServerOwner()

    const unlinkServerOwner = async () => {
      if (!serverOwner) {
        return true
      } else {
        return await this.userService.deleteServerOwner()
      }
    }

    const resetFirstTimeSetupFlag = async () => {
      return !!await this.databaseService.saveOption(OPTIONS.FIRST_TIME_SETUP_DONE.name, false)
    }

    const recreateGuestAccount = async () => {
      return !!await this.userService.recreateGuestAccount()
    }

    const settled = await Promise.all([
      this.resetMediaData(),
      unlinkServerOwner(),
      resetFirstTimeSetupFlag(),
      recreateGuestAccount(),
    ])

    const success = settled.every((result) => result === true)

    if (success) {
      this.eventService.emitPublic(AppEvents.FACTORY_RESET_SUCCESS)
      Logger.log('Factory reset complete.', 'App')
    }

    return success
  }

  /**
   * Checks for Cardinal Media Server updates and returns an object with
   * information about the age of this installation.
   * 
   * @param lazy - When performing lazy checks, we ensure that we only check once per day.
   */
  async checkForUpdates(lazy = false): Promise<HomeServerAge | null> {
    if (lazy) {
      const lastChecked = await this.databaseService.getOption(OPTIONS.LAST_CHECKED_FOR_UPDATES_AT.name) as string
      const lastCheckedTimestamp: number | null = isValid(new Date(lastChecked))
        ? new Date(lastChecked).getTime()
        : null

      // If we know the last time we checked at, and we are within the update frequency, then do not check
      if (lastCheckedTimestamp && lastCheckedTimestamp > Date.now() - AUTO_CHECK_FOR_UPDATES_FREQUENCY) {
        return
      }
    }

    const age: HomeServerAge = {
      latestVersion: null,
      updateIsAvailable: false,
      daysBehindLatestVersion: null,
      latestVersionReleasedAt: null,
      releaseChannel: envVar('RELEASE_CHANNEL', ReleaseChannels.STABLE) as string,
    }

    Logger.log('Checking for updates', 'App')

    // For safety, set the "last checked at" before doing the check so that a
    // failed update check still counts as a check
    await this.databaseService.saveOption(OPTIONS.LAST_CHECKED_FOR_UPDATES_AT.name, new Date().toString())

    if (!envVar('RELEASE_CHANNEL', undefined)) {
      Logger.error(`Cannot check for updates because the release channel env var is not set`, 'App')
      return null
    }

    if (envVar('RELEASE_CHANNEL', undefined) === ReleaseChannels.DEVELOPMENT) {
      Logger.warn(`Checking for updates on the development release channel is not supported. To use this feature, use a different release channel.`, 'App')
      return null
    }

    // Get latest version
    const latest = await this.getLatestHomeServerRelease(envVar('RELEASE_CHANNEL', undefined))

    if (!latest?.version) {
      Logger.error(`Could not determine latest available version of Media Server. Got: ${latest}`, 'App')
      return null
    }

    const updateIsAvailable = semver.valid(latest.version) && semver.valid(this.getHomeServerVersion())
      ? semver.lt(this.getHomeServerVersion(), latest.version)
      : false

    age.latestVersion = latest.version
    age.latestVersionReleasedAt = latest.releasedAt
    age.updateIsAvailable = updateIsAvailable

    if (updateIsAvailable) {
      age.daysBehindLatestVersion = differenceInDays(new Date(), new Date(latest.releasedAt))
    }

    return age
  }

  /**
   * Queries the website API for the latest version.
   * 
   * @deprecated - Can be removed once nobody is using v0.1.15 anymore.
   */
  async getLatestReleases(): Promise<LatestRelease | null> {
    let latest = null

    try {
      latest = await websiteAPI('/latest')
    } catch (error) {
      Logger.error('Error when fetching latest releases from website', 'App')
      console.error(error)
    }

    return latest
  }

  /**
   * Queries the website API for the latest Media Server version on the release
   * channel.
   */
  async getLatestHomeServerRelease(channel: ReleaseChannels): Promise<LatestRelease | null> {
    let latest = null

    try {
      // FIXME
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const releases: any = await websiteAPI('/releases/cardinal-media-server/latest')
      if (releases?.channels?.[channel]) {
        latest = releases.channels[channel]
      }
    } catch (error) {
      Logger.error('Error fetching latest releases from website', 'App')
      console.error(error)
    }

    return latest
  }

  /**
   * Returns the child folders in a directory.
   */
  ls(options: LsWorkerInput): Promise<LsWorkerOutput> {
    return new Promise((resolve) => {
      const worker = new worker_threads.Worker(path.join(__dirname, 'workers', 'ls'), { workerData: options })
      worker.on('message', (data) => {
        resolve(data)
      })
      worker.on('error', (error) => {
        Logger.error(error)
        resolve(null)
      })
    })
  }
}
