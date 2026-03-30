import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from 'typeorm'

import { UuidColumn } from '../../decorators/UuidColumn.decorator'

import { BaseEntity } from '../../entities/base.entity'

import { User } from '../user/user.entity'
import { MusicTrack } from '../music-track/music-track.entity'
import { PlaybackQueueItem } from '../playback-queue/playback-queue-item.entity'

@Entity()
@Index(['track'])
export class MusicHistory extends BaseEntity {
  @UuidColumn()
  playbackEntryId: string

  @Column({ type: 'float' })
  progress: number

  @ManyToOne(() => MusicTrack, (track) => track.id)
  @JoinColumn()
  track: MusicTrack

  @OneToOne(() => PlaybackQueueItem, (queueItem) => queueItem.id)
  @JoinColumn()
  queueItem?: PlaybackQueueItem

  @ManyToOne(() => User, (user) => user.id)
  @JoinColumn()
  user: User
}
