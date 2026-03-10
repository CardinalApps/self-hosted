import {
  Entity,
  Column,
  ManyToOne,
} from 'typeorm'

import { BaseEntity } from '../../entities/base.entity'
import { Photo } from  './photo.entity'

@Entity()
export class PhotoThumbnail extends BaseEntity {
  @Column()
  thumbnailId: string

  @Column()
  absolutePath: string | null

  @Column()
  relativeSrc: string | null

  @Column()
  size: string

  @Column()
  format: string

  @Column()
  width: number

  @Column()
  height: number

  @Column()
  bytes: number

  @ManyToOne(() => Photo, (photo) => photo.thumbnail, { onDelete: 'CASCADE' })
  photo: Photo
}
