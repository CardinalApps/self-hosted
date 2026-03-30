import {
  Entity,
  Column,
  Index,
  OneToOne,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { IsOptional } from 'class-validator'

import { BaseEntity } from '../../../entities/base.entity'
import { User } from '../../user/user.entity'
import { MusicTrack } from '../../music-track/music-track.entity'
import { Photo } from '../../photo/photo.entity'

import { Run } from './run.entity'
import { JobTask } from '../../job/job-task.entity'

/**
 * We save both the absolute path and relative path for each file because it
 * makes it easy to repair the absolute paths in the event that the media
 * directories or the Media Server have moved.
 */
@Entity()
export class File extends BaseEntity {
  @ManyToOne(() => User)
  @JoinColumn()
  user: User

  @ManyToOne(() => Run, (run) => run.file, { onDelete: 'CASCADE' })
  @JoinColumn()
  run: Run

  @OneToMany(() => MusicTrack, (musicTrack) => musicTrack.file, { onDelete: 'CASCADE' })
  @JoinColumn()
  musicTrack?: MusicTrack[]

  @OneToOne(() => Photo, (photo) => photo.file, { onDelete: 'CASCADE' })
  @JoinColumn()
  photo?: Photo

  @Column({ unique: true })
  fileId: string

  @OneToMany(() => JobTask, (jobTask) => jobTask.file, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn()
  @IsOptional()
  jobTasks: JobTask[]

  // From the file system root
  @Index()
  @Column()
  absolutePath: string

  // Relative to the media directory that the user supplies
  @Column()
  relativePath: string

  @Column({ nullable: true })
  @IsOptional()
  mimeType?: string

  @Column()
  extension: string

  @Column()
  app: string

  @Column()
  mediaType: string

  @Column()
  size: number

  @Column({ nullable: true })
  @IsOptional()
  mtime?: Date

  @Column()
  lastSeen: Date
}
