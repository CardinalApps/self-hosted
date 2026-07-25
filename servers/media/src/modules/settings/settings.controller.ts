import {
  Controller,
  Param,
  Body,
  Get,
  Patch,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common'
import {
  ApiTags,
  ApiOkResponse,
  ApiParam,
} from '@nestjs/swagger'
import { getScopedSlugs } from '@cardinalapps/app-settings/dist/cjs'
import {
  getMediaServerRole,
  hasCapabilities,
  MediaServerCapability,
} from '@cardinalapps/access-control/dist/cjs'

import { SettingsService } from './settings.service'

import { GetAppSettings } from './dtos/GetAppSettings.dto'
import { GetAppSettingsResponse } from './dtos/GetAppSettingsResponse.dto'
import { UpsertSettings } from './dtos/UpsertSettings.dto'
import { UpsertSettingsResponse } from './dtos/UpsertSettingsResponse.dto'
import { StandardEndpoint } from '../../decorators/StandardEndpoint.decorator'
import { CurrentUser } from '../../decorators/CurrentUser.decorator'

// Settings that belong to the whole install rather than to one account
const serverScopedSlugs = getScopedSlugs('en', 'server')

@Controller()
@ApiTags('Settings')
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
  ) {}

  /**
   * Gets all settings for a single app.
   */
  @Get('/settings/:app')
  @StandardEndpoint({
    summary: 'Get app settings.',
  })
  @ApiParam({ name: 'app', enum: ['admin', 'music', 'photos', 'cinema'], description: 'The Cardinal app to get settings for.' })
  @ApiOkResponse({ type: GetAppSettingsResponse })
  async getAppSettings(
    @CurrentUser() user,
    @Param() params: GetAppSettings,
  ): Promise<GetAppSettingsResponse> {
    const settings = await this.settingsService.getAppSettings(params.app, user?.userId)

    return {
      settings,
    }
  }

  /**
   * Updates one or more settings in the database for a Cardinal app.
   */
  @Patch('/settings')
  @StandardEndpoint({
    summary: 'Save app settings.',
    description: 'When saving app settings, set the `app` for which this update applies. Explicitly set the app to `null` to apply the update to all apps. Account-scoped settings ignore `app` entirely and are always saved against the caller; settings that belong to the whole install require the `UserSettings.Update` capability.',
    manualCapabilities: ['UserSettings.Update'],
    manualCapabilitiesAreAllRequired: false,
    errors: {
      403: ['The payload changes a setting that belongs to the whole server and the user lacks UserSettings.Update'],
    },
  })
  @ApiOkResponse({ type: UpsertSettingsResponse })
  async upsertSettings(
    @CurrentUser() user,
    @Body() { app, settings }: UpsertSettings,
  ): Promise<UpsertSettingsResponse> {
    if (!Object.keys(settings).length) {
      throw new BadRequestException()
    }

    /*
     * Checked here rather than with an endpoint-level capability: one payload can carry both kinds
     * of setting, and requiring the capability for the whole route would stop an ordinary user
     * from saving their own theme.
     */
    const changesServerSettings = Object.keys(settings).some((slug) => serverScopedSlugs.includes(slug))
    const granted = (user?.roles || []).flatMap((assignment) => getMediaServerRole(assignment.role)?.capabilities || [])

    if (changesServerSettings && !hasCapabilities<MediaServerCapability>(['UserSettings.Update'], granted)) {
      throw new ForbiddenException()
    }

    const updated = await this.settingsService.set(app || null, settings, user?.userId)

    if (!Array.isArray(updated)) {
      throw new InternalServerErrorException()
    }

    return {
      updated,
    }
  }
}
