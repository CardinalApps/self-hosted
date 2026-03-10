import { Entity, Column, PrimaryGeneratedColumn, Unique } from 'typeorm'

import { unstringifyIfPrimitive } from '../../utils/transformers'

export enum DatabaseConstraint {
  UNIQUE_SETTING_PER_APP = 'UNIQUE_SETTING_PER_APP',
}

@Entity()
@Unique(DatabaseConstraint.UNIQUE_SETTING_PER_APP, ['app', 'name'])
export class Setting {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  app: string

  @Column()
  name: string

  @Column({
    nullable: false,
    transformer: {
      from: (val) => unstringifyIfPrimitive(val),
      to: (val) => String(val),
    },
  })
  value: string
}
