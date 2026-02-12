import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Generated,
} from 'typeorm'

import { QueueType, DynamicQueueName } from '@cardinalapps/types/dist/cjs/playback-queue'

import { BaseEntity } from '../../entities/base.entity'
import { User } from '../user/user.entity'

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
