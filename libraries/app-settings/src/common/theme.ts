import { SettingsFieldFactory, SupportedCardinalApp, SupportedLang } from '../types'
import type { CustomTheme } from './custom_themes'
import i18n from '../i18n'

export const THEME_SLUG = 'theme'

/**
 * The themes that ship with the app. Every custom theme is built on one of these, and the theme
 * CSS is keyed on them - `[data-theme="light"]` and so on - so anything that ends up on that
 * attribute has to be one of these names or no theme variables resolve at all.
 */
export const BUILT_IN_THEMES = ['light', 'dark'] as const

export type BuiltInTheme = typeof BUILT_IN_THEMES[number]

export const DEFAULT_THEME: BuiltInTheme = 'light'

export const isBuiltInTheme = (value: unknown): value is BuiltInTheme => (
  typeof value === 'string' && (BUILT_IN_THEMES as readonly string[]).includes(value)
)

/**
 * Resolves a `theme` setting to the built-in theme whose CSS should be applied.
 *
 * The setting is either a built-in name or `custom:<id>`, in which case the custom theme's `base`
 * decides. Both can go stale - a theme the user deleted, a selection that arrives before the
 * settings sync, or a `base` written by an older build - so anything unrecognised falls back
 * instead of being trusted.
 */
export const resolveBaseTheme = (theme: unknown, customThemes: CustomTheme[]): BuiltInTheme => {
  const selected = customThemes.find((customTheme) => `custom:${customTheme.id}` === theme)

  if (selected) {
    return isBuiltInTheme(selected.base) ? selected.base : DEFAULT_THEME
  }

  return isBuiltInTheme(theme) ? theme : DEFAULT_THEME
}

export const themeFactory: SettingsFieldFactory = (app: SupportedCardinalApp, lang: SupportedLang) => ({
  slug: THEME_SLUG,
  label: i18n?.['settings.theme.title']?.[lang],
  type: 'select',
  storage: 'home_server',
  scope: 'user',
  defaultValue: DEFAULT_THEME,
  options: {
    'light': i18n['settings.theme.option.light']['en'],
    'dark': i18n['settings.theme.option.dark']['en'],
  },
})
