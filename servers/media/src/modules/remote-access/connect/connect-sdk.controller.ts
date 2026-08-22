import {
  BadGatewayException,
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  InternalServerErrorException,
  Post,
  Put,
  Query,
  Req,
  Res,
} from '@nestjs/common'
import { ApiConflictResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Response } from 'express'

import { CloudEnableError, ConnectSDKService, VanityProxyResponse, VanityUnavailableError } from './connect-sdk.service'
import { ConnectStatusResponse } from './dtos/ConnectStatusResponse.dto'
import { SetVanityNameDto, VanityNameQueryDto } from './dtos/VanityName.dto'
import { VanityAvailabilityResponse, VanityStatusResponse } from './dtos/VanityResponse.dto'
import { StandardEndpoint } from '../../../decorators/StandardEndpoint.decorator'
import { getCardinalTolkienFromHeaders } from '../../../utils/jwt'

// The refusals the vanity endpoints hand back, documented once because all four share them.
const VANITY_PROXY_DESCRIPTION = 'Answers from the Remote Access Server are passed through untouched, including its refusals: <code>422 invalid_name</code>, <code>409 name_unavailable</code> / <code>label_limit_reached</code>, <code>429 rename_cooldown</code>, <code>402 cert_unavailable</code> and <code>503 vanity_disabled</code>.'
const VANITY_PROXY_ERRORS = { 400: ['Remote Access is not enabled on this server, or it holds no cloud credential'] }

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

  /**
   * Reports whether a vanity name is free for this server to take.
   */
  @Get('/connect/vanity/availability')
  @StandardEndpoint({
    summary: 'Check whether a vanity hostname is available.',
    description: VANITY_PROXY_DESCRIPTION,
    capabilities: ['ServerSettings.Update'],
    errors: VANITY_PROXY_ERRORS,
  })
  @ApiOkResponse({ type: VanityAvailabilityResponse })
  async vanityAvailability(@Query() { name }: VanityNameQueryDto, @Res({ passthrough: true }) res: Response): Promise<unknown> {
    return await proxy(res, () => this.connectSDKService.getVanityAvailability(name))
  }

  /**
   * Returns the vanity names this server currently holds.
   */
  @Get('/connect/vanity')
  @StandardEndpoint({
    summary: 'Get this server\'s vanity hostnames.',
    description: VANITY_PROXY_DESCRIPTION,
    capabilities: ['ServerSettings.Update'],
    errors: VANITY_PROXY_ERRORS,
  })
  @ApiOkResponse({ type: VanityStatusResponse })
  async vanity(@Res({ passthrough: true }) res: Response): Promise<unknown> {
    return await proxy(res, () => this.connectSDKService.getVanity())
  }

  /**
   * Claims a vanity name for this server.
   */
  @Put('/connect/vanity')
  @StandardEndpoint({
    summary: 'Claim a vanity hostname for this server.',
    description: VANITY_PROXY_DESCRIPTION,
    capabilities: ['ServerSettings.Update'],
    errors: VANITY_PROXY_ERRORS,
  })
  @ApiOkResponse({ type: VanityStatusResponse })
  async setVanity(@Body() { name }: SetVanityNameDto, @Res({ passthrough: true }) res: Response): Promise<unknown> {
    return await proxy(res, () => this.connectSDKService.setVanity(name))
  }

  /**
   * Gives one of this server's vanity names back up.
   */
  @Delete('/connect/vanity')
  @StandardEndpoint({
    summary: 'Release one of this server\'s vanity hostnames.',
    description: VANITY_PROXY_DESCRIPTION,
    capabilities: ['ServerSettings.Update'],
    errors: VANITY_PROXY_ERRORS,
  })
  @ApiOkResponse({ type: VanityStatusResponse })
  async releaseVanity(@Query() { name }: VanityNameQueryDto, @Res({ passthrough: true }) res: Response): Promise<unknown> {
    return await proxy(res, () => this.connectSDKService.releaseVanity(name))
  }
}

/*
 * Wears the Remote Access Server's answer as this endpoint's own. The Admin app's rename drawer
 * reads the error codes in the body, so nothing here interprets or re-maps them.
 */
async function proxy(res: Response, call: () => Promise<VanityProxyResponse>): Promise<unknown> {
  let result: VanityProxyResponse

  try {
    result = await call()
  } catch (error) {
    if (error instanceof VanityUnavailableError) {
      /* Not a fault either: Remote Access is simply off or unlinked here, and the drawer hides the
         feature on this answer. The header keeps generic error-toast layers out of it. */
      res.setHeader('Cardinal-Toast', 'none')
      throw new BadRequestException(error.message)
    }
    throw new BadGatewayException(`Could not reach the Remote Access Server: ${error.message}`)
  }

  if (result.noToast) res.setHeader('Cardinal-Toast', 'none')
  res.status(result.status)

  return result.body
}
