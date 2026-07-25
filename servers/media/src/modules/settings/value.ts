import { unstringifyIfPrimitive } from '../../utils/transformers'

/**
 * Settings are stored in a single text column so that SQLite and Postgres can
 * share one schema. Primitives keep their plain string form, which is what
 * every row written before user-scoped settings existed looks like. Objects and
 * arrays (eg. the saved custom themes) are stored as JSON, since `String(val)`
 * would flatten them to "[object Object]".
 */
export const serializeSettingValue = (value: unknown): string => {
  if (value !== null && typeof value === 'object') {
    return JSON.stringify(value)
  }

  return String(value)
}

/**
 * Reverses `serializeSettingValue`. Anything that looks like a JSON object or
 * array is parsed as one; everything else falls back to the primitive handling
 * that predates JSON values.
 */
export const parseSettingValue = (stored: string): unknown => {
  if (typeof stored !== 'string') {
    return stored
  }

  const trimmed = stored.trim()

  // Number('') is 0, so an empty string would otherwise read back as a number
  if (!trimmed.length) {
    return stored
  }

  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      return JSON.parse(trimmed)
    } catch {
      // Not JSON after all - fall through and treat it as a plain value
    }
  }

  return unstringifyIfPrimitive(stored)
}
