import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm'

import { BaseEntity } from '../../entities/base.entity'
import { Photo } from  '../photo/photo.entity'
import { PhotoAlbum } from  './photo-album.entity'

@Entity()
export class PhotoAlbumEntry extends BaseEntity {
  @Column()
  photoAlbumEntryId: string

  @ManyToOne(() => Photo, (photo) => photo.photoAlbumEntries, { onDelete: 'CASCADE' })
  @JoinColumn()
  photo: Photo

  @ManyToOne(() => PhotoAlbum, (photoAlbum) => photoAlbum.entries, { onDelete: 'CASCADE' })
  @JoinColumn()
  photoAlbum: PhotoAlbum

  @Column({ default: false })
  featured: boolean
}
