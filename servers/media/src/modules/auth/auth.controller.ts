import {
  Controller,
  Logger,
  ForbiddenException,
  GoneException,
  UnauthorizedException,
  Post,
  Body,
  Req,
  Res,
} from '@nestjs/common'
import {
  ApiHeader,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger'
import { Request, Response } from 'express'

import { LoginDetails } from './dtos/LoginDetails.dto'
import { AuthService } from './auth.service'
import { TokenService } from './token.service'
import { UserService } from '../user/user.service'
import { CloudUserService } from '../user/cloud-user.service'

import { LoginResponse } from './dtos/LoginResponse.dto'
import { StandardEndpoint } from '../../decorators/StandardEndpoint.decorator'
import { OriginApp } from '../../decorators/OriginApp'
import { CardinalApp } from '../../utils/apps'
import { envVar } from '../../utils/env'
import { getCardinalTolkienFromHeaders } from '../../utils/jwt'

const REFRESH_TOLKIEN_COOKIE = 'cardinal_refresh_tolkien'

const secureCookies = envVar('SECURE_COOKIES', false) as boolean

const REFRESH_COOKIE_BASE = {
  httpOnly: true,
  secure: secureCookies,
  sameSite: (secureCookies ? 'strict' : 'lax') as 'strict' | 'lax',
  path: '/api/v1/auth',
}

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
    private readonly tokenService: TokenService,
    private readonly userService: UserService,
    private readonly cloudUserService: CloudUserService,
  ) {}

  /**
   * Logs a user into this server. Sets the cardinal_refresh_tolkien httpOnly
   * cookie and returns a short-lived access tolkien in the response body.
   */
  @Post('/auth/login')
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
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponse> {
    try {
      const loginResult = await this.authService.login({
        localUserId: loginDetails?.userId,
        localUsername: loginDetails?.username,
        localPassword: loginDetails?.password,
        ssoJWT: loginDetails?.cardinalJWT,
        app: originApp,
      })

      if (!loginResult) {
        throw new ForbiddenException('Login was not successful.')
      }

      const maxAge = await this.tokenService.getRefreshCookieMaxAge()
      const cookieOptions = maxAge !== null ? { ...REFRESH_COOKIE_BASE, maxAge } : REFRESH_COOKIE_BASE
      res.cookie(REFRESH_TOLKIEN_COOKIE, loginResult.refreshTolkien, cookieOptions)

      delete loginResult.refreshTolkien
      return loginResult
    } catch (error) {
      Logger.error(`Login error: ${error}`, 'Auth')
      throw new ForbiddenException(error.toString())
    }
  }

  /**
   * Issues a new short-lived access tolkien using the httpOnly refresh tolkien
   * cookie. Also rotates the refresh tolkien.
   */
  @Post('/auth/refresh')
  @StandardEndpoint({
    auth: false,
    summary: 'Refresh access tolkien using the httpOnly cookie.',
  })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ JWT: string }> {
    const tolkien = req.cookies?.[REFRESH_TOLKIEN_COOKIE]

    if (!tolkien) {
      throw new UnauthorizedException('No refresh tolkien')
    }

    const payload = this.tokenService.verifyRefreshToken(tolkien)

    if (!payload) {
      res.clearCookie(REFRESH_TOLKIEN_COOKIE, { path: '/api/v1/auth' })
      throw new UnauthorizedException('Invalid or expired refresh tolkien')
    }

    const user = await this.userService.get(payload.uid)

    if (!user) {
      throw new UnauthorizedException('User not found')
    }

    // Validate status of the cloud account
    if (user.cardinalId) {
      const cloudJWT = getCardinalTolkienFromHeaders(req.headers)
      if (!cloudJWT) {
        throw new GoneException('Cloud-linked account must present a cloud token')
      }
      const cloudUser = await this.cloudUserService.getCardinalCloudUser(cloudJWT)
      this.cloudUserService.throwIfInvalidCardinalAccount(cloudUser)
    }

    const newAccessToken = await this.tokenService.createAccessToken(payload.uid)

    if (!newAccessToken) {
      throw new UnauthorizedException('Could not create new access token')
    }

    const newRefreshTolkien = await this.tokenService.createRefreshToken(payload.uid)
    const maxAge = await this.tokenService.getRefreshCookieMaxAge()
    const cookieOptions = maxAge !== null ? { ...REFRESH_COOKIE_BASE, maxAge } : REFRESH_COOKIE_BASE
    res.cookie(REFRESH_TOLKIEN_COOKIE, newRefreshTolkien, cookieOptions)

    return { JWT: newAccessToken }
  }

  /**
   * Clears the httpOnly refresh tolkien cookie, ending the long-lived session.
   */
  @Post('/auth/logout')
  @StandardEndpoint({
    auth: false,
    summary: 'Clear the refresh tolkien cookie.',
  })
  logout(@Res({ passthrough: true }) res: Response): { success: true } {
    res.clearCookie(REFRESH_TOLKIEN_COOKIE, { path: '/api/v1/auth' })
    return { success: true }
  }
}
