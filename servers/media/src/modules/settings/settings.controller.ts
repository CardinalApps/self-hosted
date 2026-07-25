import {
  Controller,
  Param,
  Body,
  Get,
  Patch,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common'
import {
  ApiTags,
  ApiOkResponse,
  ApiParam,
} from '@nestjs/swagger'

import { SettingsService } from './settings.service'

import { GetAppSettings } from './dtos/GetAppSettings.dto'
import { GetAppSettingsResponse } from './dtos/GetAppSettingsResponse.dto'
import { UpsertSettings } from './dtos/UpsertSettings.dto'
import { UpsertSettingsResponse } from './dtos/UpsertSettingsResponse.dto'
import { StandardEndpoint } from '../../decorators/StandardEndpoint.decorator'
import { CurrentUser } from '../../decorators/CurrentUser.decorator'

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
    description: 'When saving app settings, set the `app` for which this update applies. Explicitly set the app to `null` to apply the update to all apps.',
  })
  @ApiOkResponse({ type: UpsertSettingsResponse })
  async upsertSettings(
    @CurrentUser() user,
    @Body() { app, settings }: UpsertSettings,
  ): Promise<UpsertSettingsResponse> {
    if (!Object.keys(settings).length) {
      throw new BadRequestException()
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
