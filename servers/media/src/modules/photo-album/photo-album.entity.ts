import {
  Entity,
  Column,
  Index,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm'

import { BaseEntity } from '../../entities/base.entity'
import { UuidColumn } from '../../decorators/UuidColumn.decorator'
import { PhotoAlbumEntry } from  './photo-album-entry.entity'
import { PhotoAlbumMetadata } from './photo-album-metadata.entity'
import { User } from '../user/user.entity'

@Entity()
export class PhotoAlbum extends BaseEntity {
  @ManyToOne(() => User)
  @JoinColumn()
  user?: User

  @Index({ unique: true })
  @UuidColumn()
  photoAlbumId: string

  @Column()
  name: string

  @OneToMany(() => PhotoAlbumEntry, (photoAlbumEntry) => photoAlbumEntry.photoAlbum, { onDelete: 'CASCADE' })
  @JoinColumn()
  entries: PhotoAlbumEntry[]

  @OneToMany(() => PhotoAlbumMetadata, (photoAlbumMetadata) => photoAlbumMetadata.photoAlbum, { onDelete: 'CASCADE' })
  @JoinColumn()
  metadata: PhotoAlbumMetadata[]
}

export class PhotoAlbumComputed extends PhotoAlbum {
  numEntries?: number
}
