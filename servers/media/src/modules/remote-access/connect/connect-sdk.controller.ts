import {
  BadRequestException,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  InternalServerErrorException,
  Post,
  Req,
} from '@nestjs/common'
import { ApiConflictResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger'

import { CloudEnableError, ConnectSDKService } from './connect-sdk.service'
import { ConnectStatusResponse } from './dtos/ConnectStatusResponse.dto'
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
      403: ['The cloud account has no approved access to Remote Access, and the request has been queued (code <code>service_access_required</code>)'],
    },
  })
  @ApiConflictResponse({ description: 'The cloud IDP refused: every server slot on the cloud account is occupied.' })
  @ApiOkResponse({ type: ConnectStatusResponse })
  async enable(@Req() req): Promise<ConnectStatusResponse> {
    const cloudJwt = getCardinalTolkienFromHeaders(req.headers)

    if (!cloudJwt) {
      throw new BadRequestException('A Cardinal Cloud account token is required to enable Remote Access.')
    }

    try {
      await this.connectSDKService.enable(cloudJwt)
    } catch (error) {
      // The cloud's own refusals carry user-facing messages; pass them through
      if (error instanceof CloudEnableError && error.status === 409) {
        throw new ConflictException(error.message)
      }
      /* The code travels with the refusal: the Admin app tells "waiting on approval" apart from
         "not allowed" by that alone, and Remote Access stays on the server's side waiting. */
      if (error instanceof CloudEnableError && error.status === 403) {
        throw new ForbiddenException({ statusCode: 403, message: error.message, code: error.code })
      }
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
