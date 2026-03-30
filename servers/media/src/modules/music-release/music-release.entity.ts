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
import { MusicTrack } from  '../music-track/music-track.entity'
import { MusicArtist } from  '../music-artist/music-artist.entity'
import { MusicGenre } from  '../music-genres/music-genre.entity'
import { MusicReleaseMetadata } from './music-release-metadata.entity'
import { MusicReleaseThumbnail } from './music-release-thumbnail.entity'

@Entity()
@Index(['title'])
@Index(['createdAt'])
@Index(['artist'])
export class MusicRelease extends BaseEntity {
  @OneToMany(() => MusicTrack, (musicTrack) => musicTrack.release, { onDelete: 'CASCADE' })
  @JoinColumn()
  tracks?: MusicTrack[]

  /**
   * This is the primary artist.
   * 
   * See: https://github.com/borewit/music-metadata/blob/HEAD/doc/common_metadata.md
   */
  @ManyToOne(() => MusicArtist, (musicArtist) => musicArtist.releases, { onDelete: 'CASCADE' })
  artist?: MusicArtist

  /**
   * This is the list of all artists that contributed to the album. It includes
   * the primary artist.
   * 
   * See: https://github.com/borewit/music-metadata/blob/HEAD/doc/common_metadata.md
   */
  @ManyToMany(() => MusicArtist, (musicArtist) => musicArtist.releases, { onDelete: 'CASCADE' })
  artists?: MusicArtist[]

  @ManyToMany(() => MusicGenre, (musicGenre) => musicGenre.releases, { onDelete: 'CASCADE' })
  @JoinTable()
  genres?: MusicGenre[]

  @Index({ unique: true })
  @UuidColumn()
  musicReleaseId: string

  @Column({ nullable: true })
  title?: string

  @Column({ nullable: true })
  sortTitle?: string

  @OneToMany(() => MusicReleaseMetadata, (musicReleaseMetadata) => musicReleaseMetadata.release, { onDelete: 'CASCADE' })
  @JoinColumn()
  metadata?: MusicReleaseMetadata[]

  @OneToMany(() => MusicReleaseThumbnail, (musicReleaseThumbnail) => musicReleaseThumbnail.release, { onDelete: 'CASCADE' })
  @JoinColumn()
  thumbnails?: MusicReleaseThumbnail[]
}

export class MusicReleaseComputed extends MusicRelease {
  numEntries?: number
}
