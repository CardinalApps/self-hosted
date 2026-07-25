import { Entity, Column, PrimaryGeneratedColumn, Unique } from 'typeorm'

import { parseSettingValue, serializeSettingValue } from './value'

export enum DatabaseConstraint {
  UNIQUE_SETTING_PER_APP = 'UNIQUE_SETTING_PER_APP',
}

/**
 * A single stored setting.
 *
 * `app` is either a Cardinal app or the string `global`, which applies to every
 * app. `userId` is the owning account for user-scoped settings, or an empty
 * string for settings belonging to the server as a whole - empty string rather
 * than null because SQLite and Postgres both treat NULLs as distinct in a
 * unique index, which would let duplicate server-wide rows accumulate and stop
 * upserts from ever matching.
 */
@Entity()
@Unique(DatabaseConstraint.UNIQUE_SETTING_PER_APP, ['app', 'name', 'userId'])
export class Setting {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  app: string

  @Column({ default: '' })
  userId: string

  @Column()
  name: string

  @Column({
    nullable: false,
    transformer: {
      from: (val) => parseSettingValue(val),
      to: (val) => serializeSettingValue(val),
    },
  })
  value: string
}
