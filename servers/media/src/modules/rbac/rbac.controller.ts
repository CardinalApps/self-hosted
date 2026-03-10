import {
  Controller,
  Body,
  Get,
  InternalServerErrorException,
  Post,
  Delete,
  Param,
  Query,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import {
  ApiTags,
} from '@nestjs/swagger'
import { getMediaServerRole, MediaServerRoleNames } from '@cardinalapps/access-control/dist/cjs'

import { RBACService } from './rbac.service'
import { RoleAssignment } from './role-assignment.entity'
import { AssignRolesDto } from './dtos/AssignRoles.dto'
import { RevokeRolesDto } from './dtos/RevokeRoles.dto'

import { User } from '../user/user.entity'
import { UserService } from '../user/user.service'
import { StandardEndpoint } from '../../decorators/StandardEndpoint.decorator'
import { GetRoleAssignmentsDto } from './dtos/GetRoleAssignments.dto'

@Controller('/roles')
@ApiTags('Role Assignments')
export class RBACController {
  constructor(
    private readonly rbacService: RBACService,
    private readonly userService: UserService,
  ) {}

  /**
   * Returns all role assignments for all users.
   */
  @Get('/assignments')
  @StandardEndpoint({
    summary: 'Get role assignments.',
    description: 'Get all role assignments for all users, or all role assignments for just one user.',
    capabilities: ['RoleAssignments.Read'],
    errors: {
      400: [],
    },
  })
  async getRoleAssignments(@Query() query: GetRoleAssignmentsDto): Promise<RoleAssignment[]> {
    let assignments = []

    if (query?.userId) {
      const user = await this.userService.getUserByLocalId(query.userId)
      if (!user) {
        throw new BadRequestException('Invalid user ID')
      }
      assignments = await this.rbacService.getAndCountAllRoleAssignments(user)
    } else {
      assignments = await this.rbacService.getAndCountAllRoleAssignments()
    }

    return assignments
  }

  /**
   * Assigns roles by creating a role assignments.
   */
  @Post('/:role/assignments')
  @StandardEndpoint({
    summary: 'Assign roles.',
    description: 'Assign a role to one or more users by creating role assignments. If the user already has the role, the existing assignment will be returned.',
    capabilities: ['RoleAssignments.Create'],
    errors: {
      400: [],
      403: ['The role is non-assignable'],
    },
  })
  async assignRoles(
    @Body() { userIds }: AssignRolesDto,
    @Param('role') role: MediaServerRoleNames,
  ): Promise<RoleAssignment[]> {
    const userEntities: User[] = []

    for (const userId of userIds) {
      const entity = await this.userService.getUserByLocalId(userId)
      userEntities.push(entity)
    }

    if (!getMediaServerRole(role).assignable) {
      throw new ForbiddenException(`The role "${role}" is not assignable.`)
    }

    const assignments = await this.rbacService.assignRole(role, userEntities)

    if (!Array.isArray(assignments)) {
      throw new InternalServerErrorException()
    }

    return assignments
  }

  /**
   * Revokes roles by deleting role assignments.
   */
  @Delete('/:role/assignments')
  @StandardEndpoint({
    summary: 'Revoke roles.',
    description: 'Revoke a role from one or more users by deleting role assignments. If the user does not have the role, nothing will happen. The Guest Account is protected from having its roles removed.',
    capabilities: ['RoleAssignments.Delete'],
    errors: {
      400: ['You are attempting to update the Guest Account'],
    },
  })
  async revokeRoles(
    @Query() { userIds }: RevokeRolesDto,
    @Param('role') role: MediaServerRoleNames,
  ): Promise<RoleAssignment[]> {
    const userEntities: User[] = []

    for (const userId of userIds) {
      const entity = await this.userService.getUserByLocalId(userId)
      userEntities.push(entity)
    }

    // Do not allow changes to the Guest Account role. It can be disabled
    // entirely with the Disable Account feature.
    if (userEntities.find((user) => user.designation === 'guest_account')) {
      throw new BadRequestException()
    }

    const deleted = await this.rbacService.revokeRole(role, userEntities)
    return deleted
  }
}
