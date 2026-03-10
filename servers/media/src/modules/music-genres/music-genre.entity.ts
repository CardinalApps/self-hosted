import {
  Entity,
  Column,
  ManyToMany,
  Generated,
} from 'typeorm'

import { BaseEntity } from '../../entities/base.entity'
import { MusicRelease } from  '../music-release/music-release.entity'

@Entity()
export class MusicGenre extends BaseEntity {
  // @ManyToMany(() => MusicTrack, (musicTrack) => musicTrack.genres, { onDelete: 'CASCADE' })
  // tracks?: MusicTrack[]

  @ManyToMany(() => MusicRelease, (musicRelease) => musicRelease.genres, { onDelete: 'CASCADE' })
  releases?: MusicRelease[]

  @Column()
  @Generated('uuid')
  musicGenreId: string

  @Column({ nullable: true })
  name?: string
}

export class MusicGenreComputed extends MusicGenre {
  numEntries?: number
}
