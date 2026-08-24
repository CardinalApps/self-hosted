import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'

import { CorsService } from './cors.service'
import { CorsOrigin } from './cors-origin.entity'
import { AddCorsOriginDto } from './dtos/AddCorsOrigin.dto'

import { StandardEndpoint } from '../../decorators/StandardEndpoint.decorator'
import { CurrentUser } from '../../decorators/CurrentUser.decorator'
import { User } from '../user/user.entity'

@Controller('/cors-origins')
@ApiTags('CORS Origins')
export class CorsController {
  constructor(
    private readonly corsService: CorsService,
  ) {}

  /**
   * Returns all user-configured custom CORS origins.
   */
  @Get('/')
  @StandardEndpoint({
    summary: 'Get the custom CORS origins.',
    description: 'Get the user-configured origins that are allowed to use the API, in addition to the built-in allowlist.',
    capabilities: ['ServerSettings.Read'],
  })
  async getCorsOrigins(): Promise<CorsOrigin[]> {
    return await this.corsService.getCustomOrigins()
  }

  /**
   * Adds a custom CORS origin.
   */
  @Post('/')
  @StandardEndpoint({
    summary: 'Add a custom CORS origin.',
    capabilities: ['ServerSettings.Update'],
    errors: {
      400: ['The origin is not a well-formed http(s) URL'],
    },
  })
  async addCorsOrigin(
    @Body() { origin }: AddCorsOriginDto,
    @CurrentUser() user: User,
  ): Promise<CorsOrigin> {
    return await this.corsService.addCustomOrigin(origin, user?.userId)
  }

  /**
   * Deletes a custom CORS origin.
   */
  @Delete('/:id')
  @StandardEndpoint({
    summary: 'Delete a custom CORS origin.',
    capabilities: ['ServerSettings.Update'],
  })
  async deleteCorsOrigin(@Param('id') corsOriginId: string): Promise<void> {
    const deleted = await this.corsService.removeCustomOrigin(corsOriginId)

    if (!deleted) {
      throw new NotFoundException('There is no custom CORS origin with that ID.')
    }
  }
}
