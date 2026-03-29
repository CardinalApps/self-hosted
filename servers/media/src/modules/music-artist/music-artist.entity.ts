import {
  Entity,
  Column,
  OneToMany,
  ManyToMany,
  JoinColumn,
  JoinTable,
} from 'typeorm'

import { UuidColumn } from '../../decorators/UuidColumn.decorator'

import { BaseEntity } from '../../entities/base.entity'
import { MusicTrack } from  '../music-track/music-track.entity'
import { MusicRelease } from  '../music-release/music-release.entity'
import { MusicArtistMetadata } from './music-artist-metadata.entity'

@Entity()
export class MusicArtist extends BaseEntity {
  @ManyToMany(() => MusicTrack, (musicTrack) => musicTrack.artists, { onDelete: 'CASCADE' })
  tracks?: MusicTrack[]

  @ManyToMany(() => MusicRelease, (musicRelease) => musicRelease.artists, { onDelete: 'CASCADE' })
  @JoinTable()
  releases?: MusicRelease[]

  @UuidColumn()
  musicArtistId: string

  @Column({ nullable: true })
  name?: string

  @Column({ nullable: true })
  sortName?: string

  @OneToMany(() => MusicArtistMetadata, (musicTrackMetadata) => musicTrackMetadata.musicTrack, { onDelete: 'CASCADE' })
  @JoinColumn()
  metadata?: MusicArtistMetadata[]
}

export class MusicArtistComputed extends MusicArtist {
  numEntries?: number
}
