import { Entity, Column } from 'typeorm'

import { BaseEntity } from '../../entities/base.entity'

/**
 * Single-row table holding this server's lifetime Popularity Data Pool
 * contribution stats.
 */
@Entity()
export class PopularityStats extends BaseEntity {
  @Column({ default: 0 })
  playsContributed: number
}
