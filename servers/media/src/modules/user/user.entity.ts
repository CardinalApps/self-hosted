import {
  Entity,
  Column,
  OneToMany,
  JoinColumn,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm'
import * as bcrypt from 'bcryptjs'

import { SubscriptionTierSlug } from '@cardinalapps/products/dist/cjs/subscriptions'

import { BaseEntity } from '../../entities/base.entity'
import { RoleAssignment } from '../rbac/role-assignment.entity'

/**
 * Each user entity represents a single human that can log into the Media Server.
 * 
 * All user accounts are local accounts by default, but can optionally be
 * associated with a Cardinal cloud account.
 */
@Entity()
export class User extends BaseEntity {
  // This is the ID of the local Cardinal Media Server user
  @Column()
  userId: string

  // This is the ID of the Cardinal account that the user logged into. It cannot
  // be updated after it's first been set.
  @Column({ update: false, unique: true, nullable: true })
  cardinalId?: string

  @Column({
    nullable: true,
    type: 'varchar',
    transformer: {
      from: (val) => JSON.parse(val),
      to: (val) => JSON.stringify(val),
    },
  })
  cachedCloudUser?: {
    subscription: SubscriptionTierSlug
  }

  @Column({ nullable: true })
  cachedCloudUserAt?: Date

  @Column({ nullable: false, default: true })
  enabled?: boolean

  /**
   * @deprecated Replaced by Role Assignments.
   */
  @Column({ nullable: true })
  role: string

  @Column({ nullable: true })
  designation?: string

  @Column({ nullable: true })
  activityStatus?: string

  @Column({ nullable: true })
  activityStatusUpdatedAt?: Date

  @OneToMany(() => RoleAssignment, (assignment) => assignment.user, { onDelete: 'CASCADE' })
  @JoinColumn()
  roles: RoleAssignment[]

  @Column({ nullable: true })
  username?: string

  @Column({ nullable: true, select: false })
  password?: string

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword(): Promise<void> {
    // Allow empty string
    if (typeof this.password === 'string') {
      this.password = await bcrypt.hash(this.password, 10)
    }
  }
}
