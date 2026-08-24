/**
 * Row IDs are a 32 bit signed integer column, so an all-digits identifier that
 * overflows it cannot be one. Postgres throws on an out of range comparison
 * where SQLite simply matches nothing, so overflowing values are treated as the
 * entity's UUID identifier and fall through to a 404.
 */
export const MAX_ROW_ID = 2147483647

/**
 * Decides whether an identifier taken from a URL param addresses a numeric row
 * ID rather than a UUID. Params arrive as strings, so an all-digits string
 * counts, but only while it fits the row ID column.
 */
export const isRowId = (id: number | string): boolean => {
  return typeof id === 'number'
    ? Number.isInteger(id) && id >= 0 && id <= MAX_ROW_ID
    : /^\d+$/.test(id) && Number(id) <= MAX_ROW_ID
}
