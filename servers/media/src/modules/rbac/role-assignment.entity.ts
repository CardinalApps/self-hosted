import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm'

import { User } from '../user/user.entity'
import { BaseEntity } from '../../entities/base.entity'

@Entity()
export class RoleAssignment extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number

  @ManyToOne(() => User, (user) => user.roles, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User

  @Column({ nullable: false })
  role: string
}
