import { Controller, Get, Post, Delete, Body, Param, NotFoundException, BadRequestException, Logger } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { MediaServerRoleNames } from '@cardinalapps/access-control/dist/cjs'

import { AppService } from './app.service'
import { DatabaseService } from '../database/database.service'
import { UserService } from '../user/user.service'
import { RBACService } from '../rbac/rbac.service'
import { LibraryService } from '../library/library.service'
import { StandardEndpoint } from '../../decorators/StandardEndpoint.decorator'
import { envVar } from '../../utils/env'

/*
  Dev-only helpers for end-to-end tests. Every handler short-circuits with a
  404 unless CARDINAL_ENABLE_DEV_ENDPOINTS=true is set in the environment,
  matching the auth server's per-route NODE_ENV gating pattern.

  Mounted under /dev/* in URL space. Not in the OpenAPI public surface — these
  are not stable contracts; they exist to let tests cheat past expensive
  bootstrap or seeding steps.
*/

function devEndpointsEnabled(): boolean {
  return envVar('CARDINAL_ENABLE_DEV_ENDPOINTS', false) === true
}

@Controller('dev')
@ApiTags('Dev')
export class DevController {
  constructor(
    private readonly appService: AppService,
    private readonly databaseService: DatabaseService,
    private readonly userService: UserService,
    private readonly rbacService: RBACService,
    private readonly libraryService: LibraryService,
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

  // Complete first-time-setup non-interactively. Tests that aren't about the
  // wizard itself shouldn't have to walk through it — they call this once and
  // proceed with an already-configured server.
  @Post('/first-time-setup')
  @StandardEndpoint({
    auth: false,
    summary: 'Dev-only: complete first-time-setup without driving the wizard.',
  })
  async firstTimeSetup(
    @Body() body: {
      serverName?: string,
      theme?: string,
      sendAnonymousUsageData?: boolean,
      userCardinalJWT?: string,
    },
  ): Promise<{ ok: boolean, accountToLogInto?: string }> {
    if (!devEndpointsEnabled()) {
      throw new NotFoundException()
    }
    try {
      const result = await this.appService.initialSetup({
        theme: body.theme ?? 'light',
        serverName: body.serverName ?? 'e2e-server',
        sendAnonymousUsageData: body.sendAnonymousUsageData ?? false,
        userCardinalJWT: body.userCardinalJWT,
      })
      if (!result) {
        return { ok: false }
      }
      return { ok: true, accountToLogInto: result.accountToLogInto }
    } catch (error) {
      Logger.error(error, 'DevController.firstTimeSetup')
      throw error
    }
  }

  // Create a local user with the given username + password + role. Used by
  // tests that need a non-owner user to log in as, or to populate the users
  // table beyond the seeded owner / guest.
  @Post('/users/local')
  @StandardEndpoint({
    auth: false,
    summary: 'Dev-only: create a local user with the given role.',
  })
  async createLocalUser(
    @Body() body: { username?: string, password?: string, role?: MediaServerRoleNames },
  ): Promise<{ userId: string }> {
    if (!devEndpointsEnabled()) {
      throw new NotFoundException()
    }
    const { username, password, role } = body
    if (!username || !password || !role) {
      throw new BadRequestException('username, password, and role are all required')
    }
    try {
      const user = await this.userService.createUser({
        dto: { username, password, role },
      })
      if (!user) {
        throw new Error('createUser returned null')
      }
      return { userId: user.userId }
    } catch (error) {
      Logger.error(error, 'DevController.createLocalUser')
      throw error
    }
  }

  // Grant an additional role to an existing user (cloud or local).
  @Post('/users/grant-role')
  @StandardEndpoint({
    auth: false,
    summary: 'Dev-only: grant a role to a user.',
  })
  async grantRole(
    @Body() body: { userId?: string, role?: MediaServerRoleNames },
  ): Promise<{ ok: boolean }> {
    if (!devEndpointsEnabled()) {
      throw new NotFoundException()
    }
    const { userId, role } = body
    if (!userId || !role) {
      throw new BadRequestException('userId and role are required')
    }
    const user = await this.userService.get(userId)
    if (!user) {
      throw new NotFoundException('No such user')
    }
    try {
      const assignments = await this.rbacService.assignRole(role, [user])
      return { ok: assignments.length > 0 }
    } catch (error) {
      Logger.error(error, 'DevController.grantRole')
      throw error
    }
  }

  // Revoke a role from a user.
  @Post('/users/revoke-role')
  @StandardEndpoint({
    auth: false,
    summary: 'Dev-only: revoke a role from a user.',
  })
  async revokeRole(
    @Body() body: { userId?: string, role?: MediaServerRoleNames },
  ): Promise<{ ok: boolean }> {
    if (!devEndpointsEnabled()) {
      throw new NotFoundException()
    }
    const { userId, role } = body
    if (!userId || !role) {
      throw new BadRequestException('userId and role are required')
    }
    const user = await this.userService.get(userId)
    if (!user) {
      throw new NotFoundException('No such user')
    }
    try {
      const result = await this.rbacService.revokeRole(role, [user])
      return { ok: Array.isArray(result) }
    } catch (error) {
      Logger.error(error, 'DevController.revokeRole')
      throw error
    }
  }

  // Insert a library row directly, bypassing the production /libraries
  // controller's auth + capability checks. `ownerUserId` defaults to the
  // server owner so most tests don't have to think about it.
  @Post('/libraries')
  @StandardEndpoint({
    auth: false,
    summary: 'Dev-only: insert a library row directly.',
  })
  async createLibrary(
    @Body() body: { name?: string, paths?: string[], ownerUserId?: string },
  ): Promise<{ libraryId: string }> {
    if (!devEndpointsEnabled()) {
      throw new NotFoundException()
    }
    const { name, paths, ownerUserId } = body
    if (!paths || !paths.length) {
      throw new BadRequestException('paths must be a non-empty array')
    }
    // Resolve owner: explicit userId → server owner → guest account. The
    // guest fallback lets tests seed libraries on a server that hasn't been
    // claimed yet (the most common dev-mode shape).
    const owner = ownerUserId
      ? await this.userService.get(ownerUserId)
      : (await this.userService.getServerOwner()) ?? (await this.userService.getGuestAccount())
    if (!owner) {
      throw new BadRequestException('No owner user available — pass ownerUserId, run first-time-setup, or ensure a guest account exists.')
    }
    try {
      const library = await this.libraryService.createLibrary(name || 'e2e-library', owner, paths)
      return { libraryId: library.libraryId }
    } catch (error) {
      Logger.error(error, 'DevController.createLibrary')
      throw error
    }
  }

  // Delete a library by its libraryId UUID.
  @Delete('/libraries/:libraryId')
  @StandardEndpoint({
    auth: false,
    summary: 'Dev-only: delete a library by libraryId.',
  })
  async deleteLibrary(@Param('libraryId') libraryId: string): Promise<{ ok: boolean }> {
    if (!devEndpointsEnabled()) {
      throw new NotFoundException()
    }
    const library = await this.libraryService.getLibrary(libraryId)
    if (!library) {
      throw new NotFoundException('No such library')
    }
    try {
      const ok = await this.libraryService.deleteLibraries(library.id)
      return { ok }
    } catch (error) {
      Logger.error(error, 'DevController.deleteLibrary')
      throw error
    }
  }
}
