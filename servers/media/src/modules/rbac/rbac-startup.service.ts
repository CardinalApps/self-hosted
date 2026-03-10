/**
 * @file This migration-as-a-file exists because at the time of writing it, the
 * database used synchronize:true. This can be removed once the system has moved
 * to database migrations.
 */

import { Injectable, Logger } from '@nestjs/common'
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'

import { RoleAssignment } from './role-assignment.entity'
import { User } from '../user/user.entity'
import { RBACService } from './rbac.service'
import { MediaServerRoleName } from '@cardinalapps/access-control/dist/cjs'

@Injectable()
export class RBACStartupService {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
    @InjectRepository(RoleAssignment)
    private roleAssignmentRepository: Repository<RoleAssignment>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly rbacService: RBACService,
  ) {}

  async onModuleInit() {
    await this.maybeMigrateLegacyOwnerRoleAttributeToNewRoleAssignment()
    await this.maybeMigrateLegacyUserRoles()
  }

  /**
   * A one-time startup migration that adds creates the Owner role assignment
   * for users created before the Role Assignment system.
   */
  async maybeMigrateLegacyOwnerRoleAttributeToNewRoleAssignment() {
    // Does a user exist with the old way of storing roles?
    const legacyOwnerRole = await this.userRepository.findOne({
      where: {
        role: 'owner',
      },
    })

    if (legacyOwnerRole) {
      const ownerRoleAssignment = await this.rbacService.hasRole(legacyOwnerRole, MediaServerRoleName.OWNER)

      // If the legacy owner doesn't have the new owner role, create it and
      // remove the legacy role
      if (!ownerRoleAssignment) {
        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()
        await queryRunner.startTransaction()

        try {
          await queryRunner.manager.save(RoleAssignment, {
            user: legacyOwnerRole,
            role: 'owner',
          })

          const update = await queryRunner.manager.update(User, { id: legacyOwnerRole.id }, {
            role: '',
          })

          if (update.affected !== 1) {
            throw new Error('Failed to remove legacy owner role.')
          }

          await queryRunner.commitTransaction()

          Logger.log(`Migrated legacy user role attribute to Role Assignment for [role=owner] [user=${legacyOwnerRole.userId}]`, 'RBAC')
        } catch (error) {
          await queryRunner.rollbackTransaction()
          Logger.error(error)
        } finally {
          await queryRunner.release()
        }
      } else {
        Logger.warn(`Found legacy owner account with owner role assignment - this should be reported.`, 'RBAC')
      }
    }
  }

  /**
   * A one-time startup migration that migrates all legacy roles except Owner.
   */
  async maybeMigrateLegacyUserRoles() {
    // There were only one other type of role at the time, the "user" role
    const usersWithLegacyUserRole = await this.userRepository.find({
      where: {
        role: 'user',
      },
    })

    if (usersWithLegacyUserRole.length) {
      for (const user of usersWithLegacyUserRole) {
        const newcomerRoleAssignment = await this.rbacService.hasRole(user, MediaServerRoleName.NEWCOMER)

        // If the user doesn't have the newcomer role, create it and remove the
        // legacy role
        if (!newcomerRoleAssignment) {
          const queryRunner = this.dataSource.createQueryRunner()
          await queryRunner.connect()
          await queryRunner.startTransaction()

          try {
            const assigned = await queryRunner.manager.save(RoleAssignment, {
              user,
              role: user.designation === 'guest_account'
                ? 'administrator'
                : 'newcomer',
            })

            if (!assigned) {
              throw new Error('Failed to create new user role assignment.')
            }

            const update = await queryRunner.manager.update(User, { id: user.id }, {
              role: '',
            })

            if (update.affected !== 1) {
              throw new Error('Failed to remove legacy user role.')
            }

            await queryRunner.commitTransaction()

            Logger.log(`Migrated legacy user role attribute to Role Assignment for [role=user] [user=${user.userId}]`, 'RBAC')
          } catch (error) {
            await queryRunner.rollbackTransaction()
            Logger.error(error)
          } finally {
            await queryRunner.release()
          }
        } else {
          Logger.warn(`Found legacy user account with newcomer role assignment - this should be reported.`, 'RBAC')
        }
      }
    }
  }
}
