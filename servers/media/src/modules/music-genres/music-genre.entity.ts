import {
  Entity,
  Column,
  ManyToMany,
} from 'typeorm'

import { UuidColumn } from '../../decorators/UuidColumn.decorator'

import { BaseEntity } from '../../entities/base.entity'
import { MusicRelease } from  '../music-release/music-release.entity'

@Entity()
export class MusicGenre extends BaseEntity {
  // @ManyToMany(() => MusicTrack, (musicTrack) => musicTrack.genres, { onDelete: 'CASCADE' })
  // tracks?: MusicTrack[]

  @ManyToMany(() => MusicRelease, (musicRelease) => musicRelease.genres, { onDelete: 'CASCADE' })
  releases?: MusicRelease[]

  @UuidColumn()
  musicGenreId: string

  @Column({ nullable: true })
  name?: string
}

export class MusicGenreComputed extends MusicGenre {
  numEntries?: number
}
