import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  ManyToMany,
} from 'typeorm'

import { UuidColumn } from '../../decorators/UuidColumn.decorator'

import { BaseEntity } from '../../entities/base.entity'

import { User } from '../user/user.entity'
import { PlaybackQueue } from '../playback-queue/playback-queue.entity'

@Entity()
export class Library extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number

  @UuidColumn()
  libraryId: string

  @Column()
  name: string

  @Column({
    nullable: true,
    type: 'varchar',
    transformer: {
      from: (val) => JSON.parse(val),
      to: (val) => JSON.stringify(val),
    },
  })
  paths: string[]

  @ManyToOne(() => User)
  @JoinColumn()
  user: User

  @ManyToMany(() => PlaybackQueue, (playbackQueue) => playbackQueue.libraries, { onDelete: 'CASCADE' })
  @JoinColumn()
  playbackQueues: PlaybackQueue[]

  // TODO sharedWith column or equivalent
}
