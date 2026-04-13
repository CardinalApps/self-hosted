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

export const RatingMediaType = {
  MUSIC_TRACK: 'music_track',
} as const

export type RatingMediaType = typeof RatingMediaType[keyof typeof RatingMediaType]

@Entity()
@Unique(['user', 'mediaType', 'mediaId'])
export class Rating extends BaseEntity {
  @UuidColumn()
  ratingId: string

  @Column({ type: 'float' })
  rating: number

  @Column()
  mediaType: RatingMediaType

  @Column()
  mediaId: string

  @ManyToOne(() => User, (user) => user.id, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User
}
