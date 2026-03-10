import {
  Entity,
  Column,
  ManyToOne,
  Generated,
  JoinColumn,
} from 'typeorm'
import { IsDate, IsOptional, IsString } from 'class-validator'

import { BaseEntity } from '../../entities/base.entity'
import { File } from '../indexing/entities/file.entity'
import { Job } from './job.entity'

import { JobTaskStatus, JobTaskType } from './enums'
import { JobTaskResults } from './types'

@Entity()
export class JobTask extends BaseEntity {
  @Column()
  @Generated('uuid')
  jobTaskId: string

  @ManyToOne(() => Job, (job) => job.tasks, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn()
  @IsOptional()
  job?: Job

  @ManyToOne(() => File, (file) => file.jobTasks, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn()
  @IsOptional()
  file?: File

  @Column({ type: 'text', default: null, nullable: true })
  @IsString()
  type: JobTaskType

  /**
   * The target is the thing that the job task has to do its work on, and it
   * should be a string that refers to anything (ID, URL, slug).
   */
  @Column({ default: null, nullable: true })
  target: string

  @Column({ type: 'text', default: JobTaskStatus.IN_QUEUE, nullable: true })
  @IsString()
  status: JobTaskStatus

  @Column({ nullable: true })
  @IsDate()
  completedAt: Date

  @Column({ nullable: true })
  @IsString()
  errorMessage: string

  @Column({ nullable: true, type: 'json' })
  results?: JobTaskResults
}
