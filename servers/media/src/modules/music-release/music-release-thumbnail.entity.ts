import {
  Entity,
  Column,
  ManyToOne,
} from 'typeorm'

import { BaseEntity } from '../../entities/base.entity'
import { MusicRelease } from  './music-release.entity'

@Entity()
export class MusicReleaseThumbnail extends BaseEntity {
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

  @ManyToOne(() => MusicRelease, (musicRelease) => musicRelease.thumbnails, { onDelete: 'CASCADE' })
  release: MusicRelease
}
