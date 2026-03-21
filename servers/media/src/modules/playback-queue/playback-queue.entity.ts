import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Generated,
  ManyToMany,
  JoinTable,
  OneToMany,
} from 'typeorm'

import { BaseEntity } from '../../entities/base.entity'
import { User } from '../user/user.entity'
import { Library } from '../library/library.entity'
import { PlaybackQueueItem } from './playback-queue-item.entity'

export type QueueType = 'static' | 'dynamic'
export type DynamicQueueType = 'true_shuffle'

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

  @Column({ nullable: true })
  dynamicType: DynamicQueueType

  @ManyToMany(() => Library, (library) => library.playbackQueues, { onDelete: 'CASCADE' })
  @JoinTable()
  libraries: Library[]

  @OneToMany(() => PlaybackQueueItem, (playbackQueueItem) => playbackQueueItem.queue, { onDelete: 'CASCADE' })
  @JoinColumn()
  items?: PlaybackQueueItem[]
}
