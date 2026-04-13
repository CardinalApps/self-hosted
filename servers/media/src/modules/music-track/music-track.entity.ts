import {
  Entity,
  Column,
  Index,
  OneToMany,
  ManyToOne,
  ManyToMany,
  JoinColumn,
  JoinTable,
} from 'typeorm'

import { UuidColumn } from '../../decorators/UuidColumn.decorator'

import { BaseEntity } from '../../entities/base.entity'
import { File } from  '../indexing/entities/file.entity'
import { MusicArtist } from  '../music-artist/music-artist.entity'
import { MusicRelease } from  '../music-release/music-release.entity'
import { MusicTrackMetadata } from './music-track-metadata.entity'
import { MusicHistory } from '../music-history/music-history.entity'

@Entity()
@Index(['file'])
@Index(['release'])
@Index(['title'])
@Index(['createdAt'])
export class MusicTrack extends BaseEntity {
  @ManyToOne(() => File, (file) => file.musicTrack, { onDelete: 'CASCADE' })
  @JoinColumn()
  file: File

  @ManyToMany(() => MusicArtist, (musicArtist) => musicArtist.tracks, { onDelete: 'CASCADE' })
  @JoinTable()
  artists: MusicArtist[]

  @ManyToOne(() => MusicRelease, (musicRelease) => musicRelease.tracks, { onDelete: 'CASCADE' })
  @JoinColumn()
  release: MusicRelease

  @Index({ unique: true })
  @UuidColumn()
  musicTrackId: string

  @Column({ nullable: true })
  title?: string

  @Column({ nullable: true })
  sortTitle?: string

  @Column({ nullable: true, type: 'integer' })
  trackNumber?: number

  @Column({ nullable: true, type: 'integer' })
  discNumber?: number

  @Column({ nullable: true, type: 'float' })
  duration?: number

  @Column({ nullable: true, type: 'float' })
  bitrate?: number

  @OneToMany(() => MusicTrackMetadata, (musicTrackMetadata) => musicTrackMetadata.track, { onDelete: 'CASCADE' })
  @JoinColumn()
  metadata?: MusicTrackMetadata[]

  @OneToMany(() => MusicHistory, (musicHistory) => musicHistory.track, { onDelete: 'CASCADE' })
  @JoinColumn()
  history?: MusicHistory[]
}

export class MusicTrackComputed extends MusicTrack {
  numEntries?: number
  playCount?: number
  rating?: number | null
}
