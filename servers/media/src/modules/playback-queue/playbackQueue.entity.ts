import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Generated,
  ManyToMany,
  JoinTable,
} from 'typeorm'

import { QueueType, DynamicQueueType } from '@cardinalapps/types/dist/cjs/playback-queue'

import { BaseEntity } from '../../entities/base.entity'
import { User } from '../user/user.entity'
import { Library } from '../library/library.entity'

@Entity()
export class PlaybackQueue extends BaseEntity {
  @Column()
  @Generated('uuid')
  queueId: string

  @ManyToOne(() => User)
  @JoinColumn()
  user: User

  @Column({ nullable: false })
  type: QueueType

  // Only used when type = dynamic
  @Column({ nullable: true })
  dynamicType: DynamicQueueType

  @ManyToMany(() => Library, (library) => library.playbackQueues, { onDelete: 'CASCADE' })
  @JoinTable()
  libraries?: Library[]
}
