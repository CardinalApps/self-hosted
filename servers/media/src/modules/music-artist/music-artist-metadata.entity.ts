import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm'

import { BaseEntity } from '../../entities/base.entity'
import { MusicArtist } from './music-artist.entity'
import { MusicMetadataSource } from '../indexing/types'

import { EmbeddedMetadataType } from '../../utils/file'
import { unstringifyIfPrimitive } from '../../utils/transformers'

@Entity()
export class MusicArtistMetadata extends BaseEntity {
  @ManyToOne(() => MusicArtist, (musicTrack) => musicTrack.metadata, { onDelete: 'CASCADE' })
  @JoinColumn()
  musicTrack: MusicArtist

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
