import { exposedThemeTokens } from './themeTokens'
import type { ThemeToken } from './themeTokens'

// The clipboard-shareable shape of a custom theme: everything except its local id
export type SharedTheme = {
  name?: string,
  base: 'light' | 'dark',
  vars: Record<string, string>,
}

const MAX_NAME_LENGTH = 60

const COLOR_PATTERN = /^(#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})|rgba?\(\s*\d{1,3}\s*[, ]\s*\d{1,3}\s*[, ]\s*\d{1,3}\s*(?:[,/]\s*[\d.]+%?\s*)?\))$/i
const LENGTH_PATTERN = /^\d+(\.\d+)?px$/
const FONT_PATTERN = /^[\w\s,'"-]+$/

// Whether the value is acceptable for the given token's type
const isValidValue = (token: ThemeToken, value: string): boolean => {
  switch (token.type) {
    case 'color':
      return COLOR_PATTERN.test(value)
    case 'length':
      return LENGTH_PATTERN.test(value)
    case 'font':
      return FONT_PATTERN.test(value)
    default:
      return false
  }
}

/**
 * Parses and validates untrusted JSON (eg. from the clipboard) into a shareable theme. Strict on
 * purpose: values land in style.setProperty, so every key must be an exposed manifest token and
 * every value must match its token's type - anything else rejects the whole payload with null.
 */
export function parseSharedTheme(raw: string): SharedTheme | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return null
  }

  const { name, base, vars } = parsed as Record<string, unknown>

  if (base !== 'light' && base !== 'dark') {
    return null
  }
  if (typeof vars !== 'object' || vars === null || Array.isArray(vars)) {
    return null
  }
  if (typeof name !== 'undefined' && typeof name !== 'string') {
    return null
  }

  const validatedVars: Record<string, string> = {}
  for (const [varName, value] of Object.entries(vars)) {
    // The accent colour is a standalone setting, never part of a theme
    if (varName === '--accent-color') {
      continue
    }

    const token = exposedThemeTokens.find((candidate) => candidate.varName === varName)
    if (!token || typeof value !== 'string' || !isValidValue(token, value.trim())) {
      return null
    }
    validatedVars[varName] = value.trim()
  }

  const trimmedName = name?.trim().slice(0, MAX_NAME_LENGTH)
  return {
    ...(trimmedName ? { name: trimmedName } : {}),
    base,
    vars: validatedVars,
  }
}
