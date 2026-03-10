import {
  Controller,
  Get,
  Post,
  Body,
  Version,
  Query,
  VERSION_NEUTRAL,
  ForbiddenException,
  Logger,
  InternalServerErrorException,
  ServiceUnavailableException,
  BadRequestException,
} from '@nestjs/common'
import {
  ApiTags,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiServiceUnavailableResponse,
} from '@nestjs/swagger'
import { HttpAdapterHost } from '@nestjs/core'
import { AllSettingsSlugs, getSetting } from '@cardinalapps/app-settings/dist/cjs'

import { AppService } from './app.service'
import { DatabaseService } from '../database/database.service'
import { SettingsService } from '../settings/settings.service'
import { StandardEndpoint } from '../../decorators/StandardEndpoint.decorator'

import { ServerSetupDto } from './dtos/ServerSetup.dto'
import { ServerResetDto } from './dtos/ServerReset.dto'
import { ListDirectoryDto } from './dtos/ListDirectory.dto'

import { CardinalApp } from '../../utils/apps'
import { helpCode } from '../../utils/help-codes'
import { MediaType } from '../../utils/media'
import { UserService } from '../user/user.service'

import { HealthStates, ResetType, ResetValidationPhrase } from './enums'
import {
  ServerAPIVersionsAndEndpointsType,
  ServerHealthStateType,
  ServerInitType,
  ServerInitResultType,
  HomeServerAge,
  HomeServerReleaseChannels,
  Versions,
  Instance,
} from './types'
import { envVar, getMediaDirs } from '../../utils/env'
import { OPTIONS } from '../../utils/options'

@Controller()
@ApiTags('General')
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly databaseService: DatabaseService,
    private readonly settingsService: SettingsService,
    private readonly userService: UserService,
    private adapterHost: HttpAdapterHost,
  ) {}

  /**
   * Returns information about the API itself.
   */
  @Get('/')
  @Version([VERSION_NEUTRAL])
  @StandardEndpoint({
    auth: false,
    summary: 'Get information about your API.',
  })
  @ApiOkResponse({
    status: 200,
    description: 'Lists all available versions of your API, and all endpoints across all versions of your API.',
    schema: {
      example: {
        versions: {
          v1: '/api/v1',
        },
        endpoints: [
          'GET /api/v1/health',
        ],
      } as ServerAPIVersionsAndEndpointsType,
    },
  })
  apiHome(): ServerAPIVersionsAndEndpointsType {
    const httpAdapter = this.adapterHost.httpAdapter.getInstance()
    const listedEndpoints = this.appService.getPubliclyListedAPIEndpoints(httpAdapter._router.stack)

    return {
      versions: {
        v1: '/api/v1',
      },
      endpoints: listedEndpoints,
    }
  }

  /**
   * Responds to health checks. This may also:
   * 
   * 1. Include information about pending updates.
   * 1. Trigger an update check (infrequently).
   */
  @Get('/health')
  @StandardEndpoint({
    auth: false,
    summary: 'Know if your Media Server is online.',
  })
  @ApiOkResponse({
    status: 200,
    description: `Returns the state of the server. If the server responds, then it's online.
      Responses will always have a 200 status. Possible states are: 
      \`${HealthStates.NORMAL}\`,  \`${HealthStates.NOT_SETUP}.\``,
    schema: {
      example: {
        state: HealthStates.NORMAL,
      } as ServerHealthStateType,
    },
  })
  async getHealth(): Promise<ServerHealthStateType> {
    const health: ServerHealthStateType = { state: null }

    if (!await this.appService.isServerSetup()) {
      health.state = HealthStates.NOT_SETUP
    } else {
      health.state = HealthStates.NORMAL
    }

    const autoCheckForUpdatesSettingFactory = getSetting('auto_check_for_updates')
    const autoCheckForUpdatesSetting = autoCheckForUpdatesSettingFactory(CardinalApp.ADMIN, 'en')
    const automaticallyCheckForUpdatesIsEnabled = await this.settingsService.get(CardinalApp.ADMIN, autoCheckForUpdatesSetting.slug as AllSettingsSlugs)

    // If the user has enabled automatically checking for updates, then every
    // health check triggers a lazy check
    if (automaticallyCheckForUpdatesIsEnabled) {
      const updateResults = await this.appService.checkForUpdates(true)

      if (updateResults?.updateIsAvailable) {
        health.update = updateResults
      }
    }

    return health
  }

  /**
   * Get the current release channel.
   */
  @Get('/release-channels')
  @StandardEndpoint({
    auth: false,
    summary: 'Get the current release channel.',
  })
  async getCurrentReleaseChannel(): Promise<HomeServerReleaseChannels> {
    return {
      current: envVar('RELEASE_CHANNEL', null),
    }
  }

  /**
   * Queries the cloud servers to check if updates are available, and returns
   * information about them. Does not support the development environment.
   */
  @Get('/updates')
  @StandardEndpoint({
    auth: false,
    summary: 'Manually check for available updates.',
  })
  @ApiOkResponse({
    status: 200,
    schema: {
      example: {
        updateIsAvailable: true,
        daysBehindLatestVersion: 42,
        latestVersion: '0.0.1',
        latestVersionReleasedAt: 'Thu Jan 04 2024 21:28:00 GMT-0500 (Eastern Standard Time)',
      } as HomeServerAge,
    },
  })
  @ApiServiceUnavailableResponse({ description: 'Returns a 503 if the latest version cannot be fetched from the cloud, or if the server is running in development mode.' })
  async getAvailableUpdates(): Promise<HomeServerAge> {
    const age = await this.appService.checkForUpdates()

    if (!age) {
      throw new ServiceUnavailableException()
    }

    return age
  }

  /**
   * Handles server initialization after the user has been asked the first time
   * setup questions. If the user opted to log into their Cardinal cloud
   * account during setup then a local user will be created and linked with
   * their cloud account.
   * 
   * After the initial setup is complete, this endpoint cannot be used again.
   */
  @Post('/setup')
  @StandardEndpoint({
    auth: false,
    summary: 'Initial setup.',
    errors: {
      403: ['The initial setup has already been completed'],
    },
  })
  @ApiCreatedResponse({ description: 'Returns an empty Created response on success.' })
  async setup(@Body() serverSetupDto: ServerSetupDto): Promise<ServerInitResultType | false> {
    if (await this.appService.isServerSetup()) {
      Logger.error(`Forbidden - First time setup may only be completed once. ${helpCode('0010')}` )
      throw new ForbiddenException('First time setup can only be completed once')
    }

    const serverSetupSuccess = await this.appService.initialSetup({
      theme: serverSetupDto?.theme,
      serverName: serverSetupDto?.serverName || '(Unknown)',
      userCardinalJWT: serverSetupDto?.ssoToken,
      sendAnonymousUsageData: serverSetupDto.sendAnonymousUsageData,
    } as ServerInitType)

    if (serverSetupSuccess) {
      Logger.log('First time setup complete', 'App')
    } else {
      Logger.error(`First time setup was not successful. ${helpCode('0011')}`, 'App')
    }

    if (serverSetupSuccess) {
      return serverSetupSuccess
    } else {
      throw new InternalServerErrorException('Could not complete first time setup')
    }
  }

  /**
   * Get a list of versions of things in the Media Server. In the `build_tag`,
   * the timestamp is of the build, not the commit.
   */
  @Get('/instance')
  @StandardEndpoint({
    summary: 'Get information about this server instance.',
    auth: false,
  })
  @ApiOkResponse({
    status: 200,
    schema: {
      example: {
        instanceId: "<id>",
        serverName: "My custom name",
      },
    },
  })
  async getInstance(): Promise<Instance> {
    const instanceId = await this.databaseService.getOption(OPTIONS.INSTANCE_ID.name) as string
    const serverName = await this.settingsService.get(CardinalApp.ADMIN, 'server_name') as string
    return {
      instanceId: instanceId || '',
      serverName: serverName || '',
    }
  }

  /**
   * Get a list of versions of things in the Media Server. In the `build_tag`,
   * the timestamp is of the build, not the commit.
   */
  @Get('/versions')
  @StandardEndpoint({
    summary: 'Get versions of things.',
  })
  @ApiOkResponse({
    status: 200,
    schema: {
      example: {
        nodejs: '0.0.0',
        openssl: '0.0.0',
        database: '0.0.0',
        cardinal_home_server: '0.0.0',
        cardinal_home_server_web_app: '0.0.0',
        cardinal_music_web_app: '0.0.0',
        cardinal_photos_web_app: '0.0.0',
        cardinal_cinema_web_app: '0.0.0',
        build_tag: '<release_channel>-<commit>-<YYMMDDTHHMMSS>',
      } as Versions,
    },
  })
  async getAppVersions(): Promise<Versions> {
    return {
      nodejs: process.versions.node,
      openssl: process.versions.openssl,
      database: await this.databaseService.getVersion() as string || '0.0.0',
      cardinal_home_server: this.appService.getHomeServerVersion(),
      cardinal_admin_web_app: this.appService.getWebAppVersion(CardinalApp.ADMIN),
      cardinal_music_web_app: this.appService.getWebAppVersion(CardinalApp.MUSIC),
      cardinal_photos_web_app: this.appService.getWebAppVersion(CardinalApp.PHOTOS),
      cardinal_cinema_web_app: this.appService.getWebAppVersion(CardinalApp.CINEMA),
      build_tag: envVar('BUILD_TAG', null) as string,
    }
  }

  /**
   * Handles resetting things.
   */
  @Post('/reset')
  @StandardEndpoint({
    summary: 'Reset server state.',
  })
  async reset(@Body() { type, validationString }: ServerResetDto): Promise<boolean> {
    if (type === ResetType.MEDIA && validationString !== ResetValidationPhrase.MEDIA) {
      throw new Error('You must enter the validation phrase.')
    }
    if (type === ResetType.FACTORY && validationString !== ResetValidationPhrase.FACTORY) {
      throw new Error('You must enter the validation phrase.')
    }

    try {
      if (type === ResetType.MEDIA) {
        return await this.appService.resetMediaData()
      } else if (type === ResetType.FACTORY) {
        return await this.appService.factoryReset()
      }
    } catch (error) {
      Logger.error(error)
    }
  }

  /**
   * Lists the contents of a directory. Only some directories that are owned by
   * Cardinal Media Server can be browsed.
   */
  @Get('/ls')
  @StandardEndpoint({
    summary: 'List the contents of a directory.',
    errors: {
      400: ['Missing root directory'],
    },
  })
  async ls(@Query() { rootDir, path, removeFileNodes, addEmptyNodes }: ListDirectoryDto): Promise<Record<string, unknown>> {
    const mounted = getMediaDirs()
    let rootPath

    // Only allow certain root dirs that Cardinal should have access to
    switch (rootDir) {
      case MediaType.MUSIC:
        rootPath = mounted?.music
        break
      case MediaType.PHOTOS:
        rootPath = mounted?.photos
        break
      case MediaType.MOVIES:
        rootPath = mounted?.movies
        break
      case MediaType.TV:
        rootPath = mounted?.tv
        break
    }

    if (!rootPath) {
      throw new BadRequestException('Missing root path')
    }

    return await this.appService.ls({
      dir: `${rootPath}${path ? path.replace(rootPath, '') : ''}`,
      removeFileNodes,
      addEmptyNodes,
    })
  }
}
