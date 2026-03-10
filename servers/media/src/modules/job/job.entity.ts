import {
  Entity,
  Column,
  OneToMany,
  Generated,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { IsDate, IsNumber, IsOptional, IsString } from 'class-validator'

import { BaseEntity } from '../../entities/base.entity'
import { Run } from '../indexing/entities/run.entity'
import { User } from '../user/user.entity'

import { JobStatus, JobType } from './enums'
import { JobTask } from './job-task.entity'

@Entity()
export class Job extends BaseEntity {
  @Generated('uuid')
  @Column({ unique: true })
  jobId: string

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn()
  user?: User

  @ManyToOne(() => Run, (run) => run.file, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn()
  run: Run

  @Column({ type: 'text', default: null, nullable: true })
  @IsString()
  type: JobType

  @Column({ type: 'text', default: JobStatus.DRAFT, nullable: true })
  @IsString()
  status: JobStatus

  @Column({ nullable: true, type: 'json' })
  parameters?: Record<string, unknown>

  @OneToMany(() => JobTask, (jobTask) => jobTask.job, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn()
  @IsOptional()
  tasks?: JobTask[]

  @Column({ default: 0 })
  @IsNumber()
  completedTasks: number

  @Column({ default: 0 })
  @IsNumber()
  remainingTasks: number

  @Column({ default: 0 })
  @IsNumber()
  totalTasks: number

  @Column({ nullable: true })
  @IsDate()
  completedAt: Date

  @Column({ nullable: true })
  @IsString()
  errorMessage: string
}
