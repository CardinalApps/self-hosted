import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm'

import { BaseEntity } from '../../entities/base.entity'
import { MusicRelease } from './music-release.entity'
import { MusicMetadataSource } from '../indexing/types'

import { EmbeddedMetadataType } from '../../utils/file'
import { unstringifyIfPrimitive } from '../../utils/transformers'

@Entity()
@Index(['release', 'metaKey'])
export class MusicReleaseMetadata extends BaseEntity {
  @ManyToOne(() => MusicRelease, (musicTrack) => musicTrack.metadata, { onDelete: 'CASCADE' })
  @JoinColumn()
  release: MusicRelease

  @Column({ type: 'text', nullable: true })
  metadataType?: EmbeddedMetadataType

  @Column({ type: 'text', nullable: true })
  metadataFormat?: MusicMetadataSource

  @Column()
  metaKey: string

  @Column({
    nullable: true,
    transformer: {
      from: (val) => unstringifyIfPrimitive(val),
      to: (val) => String(val),
    },
  })
  metaValue?: string
}
