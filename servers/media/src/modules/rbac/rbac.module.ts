import { forwardRef, Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { RBACService } from './rbac.service'
import { RoleAssignment } from './role-assignment.entity'
import { User } from '../user/user.entity'
import { RBACController } from './rbac.controller'

import { UserModule } from '../user/user.module'
import { RBACStartupService } from './rbac-startup.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([RoleAssignment, User]),
    forwardRef(() => UserModule),
  ],
  exports: [TypeOrmModule, RBACService, RBACStartupService],
  providers: [RBACService, RBACStartupService],
  controllers: [RBACController],
})
export class RBACModule {}
