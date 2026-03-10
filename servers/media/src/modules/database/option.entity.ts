import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm'

/**
 * This entity differs from the Setting entity in that it's totally private to
 * the home server internals. The user will never be able to set these options.
 */
@Entity()
export class Option {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ unique: true })
  name: string

  @Column()
  value: string
}
