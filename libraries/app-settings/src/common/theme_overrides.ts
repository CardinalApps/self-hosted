import { SettingsFieldFactory, SupportedCardinalApp, SupportedLang } from '../types'
import i18n from '../i18n'

export const THEME_OVERRIDES_SLUG = 'theme_overrides'

/*
 * A sparse map of theme CSS custom properties to values, eg.
 * { "--bg-1": "#1a1a2e" }. Applied on top of the active theme at
 * inline-style specificity; anything not in the map falls back to the
 * theme's CSS value.
 */
export type ThemeOverrides = Record<string, string>

export const themeOverridesFactory: SettingsFieldFactory = (app: SupportedCardinalApp, lang: SupportedLang) => ({
  slug: THEME_OVERRIDES_SLUG,
  label: i18n?.['settings.theme-overrides.title']?.[lang],
  type: 'json',
  storage: 'client',
  defaultValue: {} as ThemeOverrides,
})
