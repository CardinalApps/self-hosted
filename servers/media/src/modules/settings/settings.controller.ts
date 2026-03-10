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
} from '@nestjs/swagger'

import { SettingsService } from './settings.service'

import { GetAppSettings } from './dtos/GetAppSettings.dto'
import { GetAppSettingsResponse } from './dtos/GetAppSettingsResponse.dto'
import { UpsertSettings } from './dtos/UpsertSettings.dto'
import { UpsertSettingsResponse } from './dtos/UpsertSettingsResponse.dto'
import { StandardEndpoint } from '../../decorators/StandardEndpoint.decorator'

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
  async getAppSettings(@Param() params: GetAppSettings): Promise<GetAppSettingsResponse> {
    const settings = await this.settingsService.getAppSettings(params.app)

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
  })
  async upsertSettings(@Body() { app, settings }: UpsertSettings): Promise<UpsertSettingsResponse> {
    if (!Object.keys(settings).length) {
      throw new BadRequestException()
    }

    const updated = await this.settingsService.set(app || null, settings)

    if (!Array.isArray(updated)) {
      throw new InternalServerErrorException()
    }

    return {
      updated,
    }
  }
}
