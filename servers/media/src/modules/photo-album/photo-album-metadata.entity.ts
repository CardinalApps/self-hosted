import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm'

import { BaseEntity } from '../../entities/base.entity'
import { PhotoAlbum } from './photo-album.entity'

@Entity()
export class PhotoAlbumMetadata extends BaseEntity {
  @ManyToOne(() => PhotoAlbum, (photoAlbum) => photoAlbum.metadata, { onDelete: 'CASCADE' })
  @JoinColumn()
  photoAlbum: PhotoAlbum

  @Column()
  metaKey: string

  @Column({ nullable: true })
  metaValue?: string
}
