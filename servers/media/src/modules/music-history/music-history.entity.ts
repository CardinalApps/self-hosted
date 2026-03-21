import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Generated,
  OneToOne,
} from 'typeorm'

import { BaseEntity } from '../../entities/base.entity'

import { User } from '../user/user.entity'
import { MusicTrack } from '../music-track/music-track.entity'
import { PlaybackQueueItem } from '../playback-queue/playback-queue-item.entity'

@Entity()
export class MusicHistory extends BaseEntity {
  @Column()
  @Generated('uuid')
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
