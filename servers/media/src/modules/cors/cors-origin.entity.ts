import { Entity, Column } from 'typeorm'

import { UuidColumn } from '../../decorators/UuidColumn.decorator'
import { BaseEntity } from '../../entities/base.entity'

@Entity()
export class CorsOrigin extends BaseEntity {
  @UuidColumn()
  corsOriginId: string

  @Column({ unique: true })
  origin: string

  @Column({ nullable: true })
  addedByUserId?: string
}
