import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm'

import { BaseEntity } from '../../entities/base.entity'
import { User } from '../user/user.entity'

import { MusicSpotlightReasonKind } from './types'

/**
 * One resolved position of one user's spotlight sequence for one calendar day.
 * The sequence is resolved once and replayed for the rest of the day, so that
 * the listening the user does while the app is open can't re-roll the picks
 * that the same listening produced.
 *
 * Only the media's public ID is stored; everything else about the pick is read
 * back off the media itself, so a rename or a retag shows up right away. The
 * reason is stored whole, params included, because the signal that earned it
 * (a rating, an idle streak) may well be gone by the time the row is replayed.
 */
@Entity()
@Unique(['user', 'scope', 'day', 'position'])
@Index(['day'])
export class MusicSpotlightEntry extends BaseEntity {
  // Which media the sequence is about: `artist`, `release` or `track`
  @Column()
  scope: string

  // The calendar day the sequence belongs to, as `YYYY-MM-DD` in UTC
  @Column()
  day: string

  @Column()
  position: number

  // The public ID of the spotlighted artist, release or track
  @Column()
  mediaId: string

  @Column({ type: 'varchar' })
  reasonKind: MusicSpotlightReasonKind

  // The title of the favorited track, only for `favorited_track`
  @Column({ nullable: true })
  reasonTrackTitle: string | null

  /* When the pick was last played, only for `rediscover`. Held as an ISO string rather than a
     timestamp so the value the client renders is the one the day committed to, whichever
     database and driver is underneath. */
  @Column({ nullable: true })
  reasonLastPlayedAt: string | null

  @ManyToOne(() => User, (user) => user.id, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User
}
