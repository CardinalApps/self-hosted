import {
  Controller,
  Logger,
  ForbiddenException,
  Post,
  Body,
} from '@nestjs/common'
import {
  ApiHeader,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger'

import { LoginDetails } from './dtos/LoginDetails.dto'
import { AuthService } from './auth.service'

import { LoginResponse } from './dtos/LoginResponse.dto'
import { StandardEndpoint } from '../../decorators/StandardEndpoint.decorator'
import { OriginApp } from '../../decorators/OriginApp'
import { CardinalApp } from '../../utils/apps'

const loginEndpointDescription =
`Logs the user into a client application that is hosted (bundled web app) or served by this server.

If logging into the Guest Account, no credentials are required. If logging into a Cardinal Account, a valid Cardinal SSO token is required.

The client app <strong>must</strong> set the <code>cardinal-app</code> header for this request.

Only the capability corresponding to the application that you are trying to log into will be validated.`

const loginEndpointUnauthorizedDescription = 'Returns a 401 if there is an issue with the SSO token.'

/**
 * When logging in, users do not send the JWT in the Authorization header like
 * they do when they are actually logged in, so RBAC is done manually.
 */
@Controller()
@ApiTags('Authentication')
export class LoginController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  /**
   * Logs a user into this server.
   */
  @Post('/login')
  @StandardEndpoint({
    auth: false,
    manualCapabilities: ['AdminApp.Login', 'MusicApp.Login', 'PhotosApp.Login', 'CinemaApp.Login'],
    manualCapabilitiesAreAllRequired: false,
    summary: 'Log into a Cardinal app.',
    description: loginEndpointDescription,
  })
  @ApiHeader({ name: 'cardinal-app', enum: CardinalApp })
  @ApiUnauthorizedResponse({ description: loginEndpointUnauthorizedDescription })
  async login(
    @Body() loginDetails: LoginDetails,
    @OriginApp() originApp,
  ): Promise<LoginResponse> {
    try {
      const loginResult  = await this.authService.login({
        localUserId: loginDetails?.userId,
        localUsername: loginDetails?.username,
        localPassword: loginDetails?.password,
        ssoJWT: loginDetails?.cardinalJWT,
        app: originApp,
      })

      if (!loginResult) {
        throw new ForbiddenException('Login was not successful.')
      }

      return loginResult
    } catch (error) {
      Logger.error(`Login error: ${error}`, 'Auth')
      throw new ForbiddenException(error.toString())
    }
  }
}
