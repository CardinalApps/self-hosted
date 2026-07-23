import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  ManyToMany,
  JoinTable,
  OneToMany,
} from 'typeorm'

import { UuidColumn } from '../../decorators/UuidColumn.decorator'

import { BaseEntity } from '../../entities/base.entity'
import { User } from '../user/user.entity'
import { Library } from '../library/library.entity'
import { PlaybackQueueItem } from './playback-queue-item.entity'
import { DynamicQueueType, QueueSeedMediaType, QueueType } from './dtos/CreatePlaybackQueue'

@Entity()
export class PlaybackQueue extends BaseEntity {
  @UuidColumn()
  queueId: string

  @ManyToOne(() => User)
  @JoinColumn()
  user: User

  @Column({ nullable: false, type: 'varchar' })
  type: QueueType

  @Column({ nullable: true, type: 'varchar' })
  dynamicType: DynamicQueueType

  /*
    Dynamic queues that revolve around a piece of media (e.g. a House Mix seeded by a
    release) keep that seed here, so the queue can keep generating fitting items long
    after it was created.
  */
  @Column({ nullable: true, type: 'varchar' })
  seedMediaType?: QueueSeedMediaType

  @Column({ nullable: true, type: 'varchar' })
  seedMediaId?: string

  @ManyToMany(() => Library, (library) => library.playbackQueues, { onDelete: 'CASCADE' })
  @JoinTable()
  libraries: Library[]

  @OneToMany(() => PlaybackQueueItem, (playbackQueueItem) => playbackQueueItem.queue, { onDelete: 'CASCADE' })
  @JoinColumn()
  items?: PlaybackQueueItem[]
}
