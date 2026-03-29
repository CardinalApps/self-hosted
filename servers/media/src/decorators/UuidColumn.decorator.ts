import { Column, ColumnOptions } from 'typeorm'
import { envVar } from '../utils/env'

/**
 * A UUID column that uses a database-level default to generate the UUID value,
 * avoiding the need for application-level hooks or entity instances.
 *
 * PostgreSQL uses gen_random_uuid() (built-in since Postgres 13, no extension needed).
 * SQLite uses a randomblob() expression to generate a v4-compatible UUID.
 */

const SQLITE_UUID_DEFAULT = `lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))`

export function UuidColumn(options: ColumnOptions = {}): PropertyDecorator {
  const isPostgres = !!envVar('CARDINAL_POSTGRES', false)
  const defaultExpr = isPostgres ? 'gen_random_uuid()' : SQLITE_UUID_DEFAULT

  return (target: object, propertyKey: string | symbol) => {
    Column({
      ...options,
      default: () => defaultExpr,
    })(target, propertyKey)
  }
}
