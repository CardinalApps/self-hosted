import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Generated,
  PrimaryGeneratedColumn,
} from 'typeorm'

import { BaseEntity } from '../../entities/base.entity'

import { User } from '../user/user.entity'
import { MusicTrack } from '../music-track/music-track.entity'

@Entity()
export class MusicHistory extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  @Generated('uuid')
  playbackEntryId: string

  @Column({ type: 'float' })
  progress: number

  @ManyToOne(() => MusicTrack, (track) => track.id)
  @JoinColumn()
  track: MusicTrack

  @ManyToOne(() => User)
  @JoinColumn()
  user: User
}
