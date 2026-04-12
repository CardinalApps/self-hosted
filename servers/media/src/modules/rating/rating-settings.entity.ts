import {
  Entity,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm'

import { UuidColumn } from '../../decorators/UuidColumn.decorator'
import { BaseEntity } from '../../entities/base.entity'
import { User } from '../user/user.entity'

@Entity()
export class RatingSettings extends BaseEntity {
  @UuidColumn()
  settingsId: string

  @Column({ type: 'integer', default: 5 })
  starCount: number

  @OneToOne(() => User, (user) => user.id, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User
}
