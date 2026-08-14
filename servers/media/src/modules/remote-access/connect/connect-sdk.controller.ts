import { BadRequestException, Body, Controller, Get, InternalServerErrorException, Post, Put, Req } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'

import { ConnectSDKService } from './connect-sdk.service'
import { ConnectStatusResponse } from './dtos/ConnectStatusResponse.dto'
import { UpdateConnectSettingsDto } from './dtos/UpdateConnectSettings.dto'
import { StandardEndpoint } from '../../../decorators/StandardEndpoint.decorator'
import { getCardinalTolkienFromHeaders } from '../../../utils/jwt'

@Controller()
@ApiTags('Remote Access')
export class ConnectSDKController {
  constructor(
    private readonly connectSDKService: ConnectSDKService,
  ) {}

  /**
   * Enables Remote Access. The admin's cloud JWT is required because enabling
   * issues a long-lived server token from the cloud IDP.
   */
  @Post('/connect/enable')
  @StandardEndpoint({
    summary: 'Enable Remote Access.',
    description: 'Issues a Remote Access credential from Cardinal Cloud for this server and opens the control channel. Requires the cloud account JWT header.',
    capabilities: ['ServerSettings.Update'],
    cloudUserHeader: true,
    errors: {
      400: ['The cloud account JWT header is missing'],
    },
  })
  @ApiOkResponse({ type: ConnectStatusResponse })
  async enable(@Req() req): Promise<ConnectStatusResponse> {
    const cloudJwt = getCardinalTolkienFromHeaders(req.headers)

    if (!cloudJwt) {
      throw new BadRequestException('A Cardinal Cloud account token is required to enable Remote Access.')
    }

    try {
      await this.connectSDKService.enable(cloudJwt)
    } catch (error) {
      throw new InternalServerErrorException(`Could not enable Remote Access: ${error.message}`)
    }

    return await this.connectSDKService.getStatus()
  }

  /**
   * Disables Remote Access. When the cloud JWT header is present, the server
   * token is also revoked with the cloud IDP.
   */
  @Post('/connect/disable')
  @StandardEndpoint({
    summary: 'Disable Remote Access.',
    description: 'Closes the control channel and disables Remote Access. When the cloud account JWT header is present, the Remote Access credential is also revoked with Cardinal Cloud.',
    capabilities: ['ServerSettings.Update'],
    cloudUserHeader: true,
  })
  @ApiOkResponse({ type: ConnectStatusResponse })
  async disable(@Req() req): Promise<ConnectStatusResponse> {
    const cloudJwt = getCardinalTolkienFromHeaders(req.headers)

    await this.connectSDKService.disable(cloudJwt || undefined)

    return await this.connectSDKService.getStatus()
  }

  /**
   * Turns the direct and relay paths on or off independently, without
   * disabling Remote Access as a whole.
   */
  @Put('/connect/settings')
  @StandardEndpoint({
    summary: 'Update the Remote Access connection paths.',
    description: 'Enables or disables direct and relayed connections independently. Both are on while Remote Access is enabled unless turned off here.',
    capabilities: ['ServerSettings.Update'],
  })
  @ApiOkResponse({ type: ConnectStatusResponse })
  async updateSettings(@Body() settings: UpdateConnectSettingsDto): Promise<ConnectStatusResponse> {
    return await this.connectSDKService.updateSettings(settings)
  }

  /**
   * Returns the live Remote Access status for the Admin UI.
   */
  @Get('/connect/status')
  @StandardEndpoint({
    summary: 'Get the Remote Access status.',
    capabilities: ['ServerSettings.Read'],
  })
  @ApiOkResponse({ type: ConnectStatusResponse })
  async status(): Promise<ConnectStatusResponse> {
    return await this.connectSDKService.getStatus()
  }
}
