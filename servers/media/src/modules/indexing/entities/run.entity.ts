import {
  Entity,
  Column,
  OneToMany,
  JoinColumn,
} from 'typeorm'

import { BaseEntity } from '../../../entities/base.entity'
import { File } from './file.entity'

@Entity()
export class Run extends BaseEntity {
  @Column({ unique: true })
  runId: string

  @OneToMany(() => File, (file) => file.run, { onDelete: 'CASCADE' })
  @JoinColumn()
  file?: File[]

  @Column()
  status: string
}
