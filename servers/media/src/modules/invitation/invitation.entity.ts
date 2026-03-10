import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Generated,
} from 'typeorm'

import { BaseEntity } from '../../entities/base.entity'
import { User } from '../user/user.entity'

export type InvitationType = 'link' | 'user'

@Entity()
export class Invitation extends BaseEntity {
  @Column()
  @Generated('uuid')
  invitationId: string

  @Column({ nullable: false })
  expiresAt?: Date

  @ManyToOne(() => User)
  @JoinColumn()
  createdBy: User

  @Column({ nullable: true })
  invitee?: string

  @Column({ nullable: true })
  cloudLink: string

  @Column({ nullable: true })
  userFriendlyCode?: string

  @Column({ nullable: false })
  type: InvitationType
}
