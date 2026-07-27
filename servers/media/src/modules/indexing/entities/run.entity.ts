import {
  Entity,
  Column,
  OneToMany,
  JoinColumn,
} from 'typeorm'

import { BaseEntity } from '../../../entities/base.entity'
import { File } from './file.entity'
import { RunType } from '../enums'

@Entity()
export class Run extends BaseEntity {
  @Column({ unique: true })
  runId: string

  @OneToMany(() => File, (file) => file.run, { onDelete: 'CASCADE' })
  @JoinColumn()
  file?: File[]

  @Column()
  status: string

  // Set when the run stops, so history can report a finish time rather than a start time
  @Column({ nullable: true })
  completedAt: Date

  @Column({ default: RunType.FULL })
  type: string
}
