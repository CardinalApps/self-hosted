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

  /*
    Fractionally indexed, so that reordering an item only ever rewrites that one row:
    a moved item takes the midpoint of the two items it was dropped between. Positions
    are therefore ordered but not contiguous. Double precision (float8) matches the
    range of a JS number, which the midpoint arithmetic relies on.
  */
  @Column({ type: 'double precision', nullable: false })
  position: number
}
