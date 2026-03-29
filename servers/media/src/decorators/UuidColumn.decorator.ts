import { Column, ColumnOptions } from 'typeorm'
import { envVar } from '../utils/env'

const SQLITE_UUID_DEFAULT = `lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))`

/**
 * This is a custom decorator that generates a UUID in the database layer
 * instead of in the app layer.
 *
 * PostgreSQL uses `gen_random_uuid()` (built-in since Postgres 13). SQLite uses
 * a `randomblob()` expression to generate a v4-compatible UUID.
 * 
 * Why not use TypeORM's built-in `@Generated('uuid')`? Because it uses an old
 * extension called `uuid-ossp` that some newer Postgres versions don't have
 * enabled by default (e.g., Azure Flexible Postgres), and since we are using
 * TypeORM's synchronize right now (until v1.0.0) I don't have a convenient
 * place to add the SQL to enable the extension.
 * 
 * I also don't want to use a TypeORM hook like `@BeforeInsert()` because it
 * only fires if the app layer does writes using fully initialized entity
 * instances, but most of the code does writes using plain objects and I don't
 * want to refactor that or lose the ability to use plain objects in the future.
 * 
 * So... here we are.
 */
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
