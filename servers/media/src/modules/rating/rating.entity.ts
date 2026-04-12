import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm'

import { UuidColumn } from '../../decorators/UuidColumn.decorator'
import { BaseEntity } from '../../entities/base.entity'
import { User } from '../user/user.entity'
import { MusicTrack } from '../music-track/music-track.entity'

@Entity()
@Unique(['user', 'track'])
export class Rating extends BaseEntity {
  @UuidColumn()
  ratingId: string

  @Column({ type: 'float' })
  rating: number

  @ManyToOne(() => MusicTrack, (track) => track.ratings, { onDelete: 'CASCADE' })
  @JoinColumn()
  track: MusicTrack

  @ManyToOne(() => User, (user) => user.id, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User
}
