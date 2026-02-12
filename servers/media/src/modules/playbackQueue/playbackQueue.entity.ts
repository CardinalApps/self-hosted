import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Generated,
} from 'typeorm'

import { BaseEntity } from '../../entities/base.entity'
import { User } from '../user/user.entity'

export type QueueType = 'static' | 'dynamic'
export type DynamicQueueName = 'true_shuffle'

@Entity()
export class Queue extends BaseEntity {
  @Column()
  @Generated('uuid')
  queueId: string

  @ManyToOne(() => User)
  @JoinColumn()
  user: User

  @Column({ nullable: false })
  type: QueueType

  @Column({ nullable: true })
  dynamicName: DynamicQueueName
}
