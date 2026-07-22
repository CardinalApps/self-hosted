import {
  Entity,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm'

import { BaseEntity } from '../../entities/base.entity'
import { MusicTrack } from './music-track.entity'
import { QuantizedWaveformData } from '../waveform/analysis'

@Entity()
export class MusicTrackWaveform extends BaseEntity {
  @OneToOne(() => MusicTrack, (musicTrack) => musicTrack.waveform, { onDelete: 'CASCADE' })
  @JoinColumn()
  track: MusicTrack

  @Column({ type: 'integer' })
  version: number

  @Column({ type: 'integer' })
  binCount: number

  @Column({ type: 'json' })
  data: QuantizedWaveformData

  @Column({ nullable: true, type: 'float' })
  integratedLufs?: number

  @Column({ nullable: true, type: 'float' })
  truePeakDb?: number

  @Column({ nullable: true, type: 'float' })
  silenceLeadIn?: number

  @Column({ nullable: true, type: 'float' })
  silenceLeadOut?: number
}
