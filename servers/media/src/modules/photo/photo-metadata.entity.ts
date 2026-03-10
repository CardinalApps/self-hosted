import {
  Entity,
  Column,
  ManyToOne,
} from 'typeorm'

import { BaseEntity } from '../../entities/base.entity'
import { Photo } from './photo.entity'

@Entity()
export class PhotoMetadata extends BaseEntity {
  @ManyToOne(() => Photo, { onDelete: 'CASCADE' })
  photo: Photo

  @Column()
  metadataType?: string

  @Column()
  metadataFormat?: string

  @Column()
  metaKey: string

  @Column({ nullable: true })
  metaValue?: string
}
