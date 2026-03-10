import {
  Entity,
  Column,
  ManyToOne,
} from 'typeorm'

import { BaseEntity } from '../../entities/base.entity'
import { Photo } from  './photo.entity'

@Entity()
export class PhotoVariation extends BaseEntity {
  @Column()
  variationId: string

  @Column()
  absolutePath: string | null

  @Column()
  relativeSrc: string | null

  @Column()
  format: string

  @Column()
  bytes: number

  @ManyToOne(() => Photo, (photo) => photo.variations, { onDelete: 'CASCADE' })
  photo: Photo
}
