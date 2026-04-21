import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm'

import { BaseEntity } from '../../../entities/base.entity'
import { Run } from './run.entity'

export type RunLogDiffEntry = {
  from: string | null
  to: string | null
}

/**
 * A flat map of changed fields for a FILE_UPDATED event. Keys use the same
 * "format:key" namespace as MetadataSnapshot (e.g. "embedded:title").
 * Only fields that actually changed are included.
 */
export type RunLogDiff = Record<string, RunLogDiffEntry>

@Entity()
export class RunLog extends BaseEntity {
  @ManyToOne(() => Run, { onDelete: 'CASCADE' })
  @JoinColumn()
  @Index()
  run: Run

  @Column()
  event: string

  @Column({ nullable: true })
  filePath: string | null

  @Column({ nullable: true })
  mediaType: string | null

  /** Populated on FILE_UPDATED: only the fields that changed, with before/after values. */
  @Column({ type: 'simple-json', nullable: true })
  diff: RunLogDiff | null

  /** Populated on RUN_STARTED (run settings) and FILE_ERRORED (error message). */
  @Column({ type: 'simple-json', nullable: true })
  details: Record<string, unknown> | null
}
