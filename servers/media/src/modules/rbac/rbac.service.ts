import { Injectable, Logger } from '@nestjs/common'
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm'
import { DataSource, QueryRunner, Repository } from 'typeorm'
import { getMediaServerRole, MediaServerRoleNames } from '@cardinalapps/access-control/dist/cjs'

import { RoleAssignment } from './role-assignment.entity'
import { User } from '../user/user.entity'

@Injectable()
export class RBACService {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
    @InjectRepository(RoleAssignment)
    private roleAssignmentRepository: Repository<RoleAssignment>,
  ) {}

  /**
   * Gets all assignments for all or one user.
   */
  async getAndCountAllRoleAssignments(user?: User): Promise<RoleAssignment[]> {
    let found = null

    try {
      found = await this.roleAssignmentRepository.findAndCount({
        ...(user ? { where: { user: { userId: user.userId } } } : {}),
        relations: {
          user: true,
        },
      })
    } catch (error) {
      Logger.error(error, 'RBAC')
    }

    return found
  }

  /**
   * Gets all assignments for a single role.
   */
  async getRoleAssignments(role: MediaServerRoleNames): Promise<RoleAssignment[]> {
    try {
      const found = await this.roleAssignmentRepository.find({
        where: {
          role,
        },
        relations: {
          user: true,
        },
      })
      return found
    } catch (error) {
      Logger.error(error, 'RBAC')
    }
  }

  /**
   * Gets all assignments for a single user.
   */
  async getUserRoleAssignments(user: User): Promise<RoleAssignment[]> {
    try {
      const found = await this.roleAssignmentRepository.find({
        where: {
          user: {
            id: user.id,
          },
        },
        relations: {
          user: true,
        },
      })
      return found
    } catch (error) {
      Logger.error(error, 'RBAC')
      return []
    }
  }

  /**
   * Checks if a user has been assigned a role, and if so, returns that role
   * assignment, otherwise undefined.
   */
  async hasRole(user: User, role: MediaServerRoleNames): Promise<RoleAssignment | undefined> {
    const assignedRoles = await this.getUserRoleAssignments(user)
    return assignedRoles.find((assignment) => assignment.role === role)
  }

  /**
   * Assigns roles. If the user already has the role, this quietly returns
   * success.
   */
  async assignRole(roleName: MediaServerRoleNames, users: User[], queryRunner?: QueryRunner): Promise<RoleAssignment[]> {
    const assignments = []

    for (const user of users) {
      const assignment = await this.hasRole(user, roleName)

      // Quietly use the existing assignment
      if (assignment) {
        assignments.push(assignment)
        return
      }

      try {
        let newAssignment

        if (queryRunner) {
          newAssignment = await queryRunner.manager.save(RoleAssignment, {
            user,
            role: roleName,
          })
        } else {
          newAssignment = await this.roleAssignmentRepository.save({
            user,
            role: roleName,
          })
        }

        assignments.push(newAssignment)
      } catch (error) {
        Logger.error(`Failed to assign role ${roleName} to user ${user.userId}`)
        Logger.error(error)
      }
    }

    return assignments
  }

  /**
   * Revokes roles. If the user does not have the role, this quietly continues.
   * Returns an array of the deleted assignments.
   */
  async revokeRole(roleName: MediaServerRoleNames, users: User[]): Promise<RoleAssignment[]> {
    const revoked: RoleAssignment[] = []
    const role = getMediaServerRole(roleName)

    if (!role.revocable) {
      throw new Error(`The role "${roleName}" is not revocable.`)
    }

    for (const user of users) {
      const assignment = await this.hasRole(user, roleName)

      if (assignment.role === 'owner') {
        throw new Error('Cannot unassign Owner role.')
      }

      if (assignment) {
        try {
          const deleted = await this.roleAssignmentRepository.remove(assignment)
          if (deleted) {
            revoked.push(deleted)
          }
        } catch (error) {
          Logger.error(`Failed to revoke role ${roleName}`)
          Logger.error(error)
        }
      }
    }

    return revoked
  }
}
