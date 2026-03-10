import {
  Entity,
  Column,
  ManyToOne,
  Generated,
} from 'typeorm'

import { BaseEntity } from '../../entities/base.entity'
import { PlaybackQueue } from './playback-queue.entity'

@Entity()
export class PlaybackQueueItem extends BaseEntity {
  @Column({ unique: true })
  @Generated('uuid')
  queueItemId: string

  @ManyToOne(() => PlaybackQueue)
  queue: PlaybackQueue

  @Column({ nullable: false })
  mediaType: 'music_track'

  @Column({ nullable: false })
  mediaId: string

  @Column({ nullable: false })
  position: number
}
