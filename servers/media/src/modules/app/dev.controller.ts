import { Controller, Get, Post, Param, NotFoundException, Logger } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'

import { AppService } from './app.service'
import { DatabaseService } from '../database/database.service'
import { StandardEndpoint } from '../../decorators/StandardEndpoint.decorator'

/*
  Dev-only helpers for end-to-end tests. Every handler short-circuits with a
  404 unless CARDINAL_ENABLE_DEV_ENDPOINTS=true is set in the environment,
  matching the auth server's per-route NODE_ENV gating pattern.

  Mounted under /dev/* in URL space. Not in the OpenAPI public surface — these
  are not stable contracts; they exist to let tests cheat past expensive
  bootstrap or seeding steps.
*/

function devEndpointsEnabled(): boolean {
  return process.env.CARDINAL_ENABLE_DEV_ENDPOINTS === 'true'
}

@Controller('dev')
@ApiTags('Dev')
export class DevController {
  constructor(
    private readonly appService: AppService,
    private readonly databaseService: DatabaseService,
  ) {}

  // Reset the server to a fresh, unconfigured state. Wraps the existing
  // AppService.factoryReset which the production /reset endpoint also uses,
  // but skips the validation-phrase gate so tests can call it cheaply.
  @Post('/factory-reset')
  @StandardEndpoint({
    auth: false,
    summary: 'Dev-only: factory-reset the server without the validation phrase.',
  })
  async factoryReset(): Promise<{ ok: boolean }> {
    if (!devEndpointsEnabled()) {
      throw new NotFoundException()
    }
    try {
      const ok = await this.appService.factoryReset()
      return { ok }
    } catch (error) {
      Logger.error(error, 'DevController.factoryReset')
      throw error
    }
  }

  // Read a server option by name. Used by tests to assert that backend state
  // (first_time_setup_done, telemetry_opt_in, etc.) changed in response to UI
  // actions, without parsing rendered copy.
  @Get('/options/:name')
  @StandardEndpoint({
    auth: false,
    summary: 'Dev-only: read a server option by name.',
  })
  async readOption(@Param('name') name: string): Promise<{ value: unknown }> {
    if (!devEndpointsEnabled()) {
      throw new NotFoundException()
    }
    if (typeof name !== 'string' || !name) {
      throw new NotFoundException()
    }
    const value = await this.databaseService.getOption(name)
    if (value === undefined || value === null) {
      throw new NotFoundException()
    }
    return { value }
  }
}
