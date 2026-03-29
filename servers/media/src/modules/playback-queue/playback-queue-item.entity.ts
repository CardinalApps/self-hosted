import {
  Entity,
  Column,
  ManyToOne,
  OneToOne,
} from 'typeorm'

import { UuidColumn } from '../../decorators/UuidColumn.decorator'

import { BaseEntity } from '../../entities/base.entity'
import { PlaybackQueue } from './playback-queue.entity'
import { MusicHistory } from '../music-history/music-history.entity'

@Entity()
export class PlaybackQueueItem extends BaseEntity {
  @UuidColumn({ unique: true })
  queueItemId: string

  @ManyToOne(() => PlaybackQueue)
  queue: PlaybackQueue

  @OneToOne(() => PlaybackQueue, { nullable: true })
  history?: MusicHistory

  @Column({ nullable: false })
  mediaType: 'music_track'

  @Column({ nullable: false })
  mediaId: string

  @Column({ nullable: false })
  position: number
}
