import {
  Entity,
  Column,
} from 'typeorm'

import { BaseEntity } from '../../entities/base.entity'

@Entity()
export class Event extends BaseEntity {
  @Column({ unique: true })
  eventId: string

  @Column()
  payload: string
}
