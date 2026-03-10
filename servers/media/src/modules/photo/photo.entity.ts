import {
  Entity,
  Column,
  OneToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm'

import { BaseEntity } from '../../entities/base.entity'
import { File } from  '../indexing/entities/file.entity'
import { PhotoAlbumEntry } from '../photo-album/photo-album-entry.entity'
import { PhotoMetadata } from  './photo-metadata.entity'
import { PhotoThumbnail } from  './photo-thumbnail.entity'
import { PhotoVariation } from  './photo-variation.entity'

@Entity()
export class Photo extends BaseEntity {
  @Column()
  photoId: string

  @OneToOne(() => File, (file) => file.photo, { onDelete: 'CASCADE' })
  @JoinColumn()
  file: File

  @OneToMany(() => PhotoMetadata, (photoMetadata) => photoMetadata.photo, { onDelete: 'CASCADE' })
  @JoinColumn()
  metadata: PhotoMetadata[]

  @OneToMany(() => PhotoThumbnail, (photoThumbnail) => photoThumbnail.photo, { onDelete: 'CASCADE' })
  @JoinColumn()
  thumbnail: PhotoThumbnail[]

  @OneToMany(() => PhotoVariation, (photoVariation) => photoVariation.photo, { onDelete: 'CASCADE' })
  @JoinColumn()
  variations: PhotoVariation[]

  @OneToMany(() => PhotoAlbumEntry, (photoAlbumEntry) => photoAlbumEntry.photo, { onDelete: 'CASCADE' })
  @JoinColumn()
  photoAlbumEntries: PhotoAlbumEntry[]

  @Column({ nullable: true, type: 'bigint' })
  timestamp: number

  @Column({ nullable: true })
  takenAt: Date

  @Column({ nullable: true })
  takenOnDay: string

  @Column({ nullable: true })
  modifiedAt: Date

  @Column({ nullable: true })
  width: number

  @Column({ nullable: true })
  height: number

  @Column({ nullable: true })
  orientation: string

  @Column({ nullable: true })
  deviceMake: string

  @Column({ nullable: true })
  deviceModel: string

  @Column({ nullable: true, type: 'float' })
  gpsLat: number

  @Column({ nullable: true, type: 'float' })
  gpsLng: number

  @Column({ nullable: true })
  gpsLatRef: string

  @Column({ nullable: true })
  gpsLngRef: string

  @Column({ nullable: true })
  gpsAltitude: string

  @Column({ nullable: true })
  gpsTime: string

  @Column({ nullable: true })
  gpsDate: string
}
