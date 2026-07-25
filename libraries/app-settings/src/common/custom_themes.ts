import { SettingsFieldFactory, SupportedCardinalApp, SupportedLang } from '../types'
import i18n from '../i18n'

export const CUSTOM_THEMES_SLUG = 'custom_themes'

export type CustomTheme = {
  id: string,
  name: string,
  // Which built-in theme supplies the value of everything not in `vars`
  base: 'light' | 'dark',
  /*
   * A sparse map of theme CSS custom properties, eg. { "--bg-1": "#1a1a2e" }. Applied on top of the
   * base theme at inline-style specificity; anything not present falls back to the base CSS.
   */
  vars: Record<string, string>,
}

/**
 * Narrows a stored `custom_themes` value to a usable list.
 *
 * The setting is user-scoped on the Media Server, so its value arrives over the network and can be
 * anything - a database that predates the move still holds rows for it. Consumers render the app
 * shell from this, so a bad value has to degrade to "no custom themes" rather than throw.
 */
export const asCustomThemes = (value: unknown): CustomTheme[] => (
  Array.isArray(value) ? value.filter((theme) => !!theme?.id) as CustomTheme[] : []
)

export const customThemesFactory: SettingsFieldFactory = (app: SupportedCardinalApp, lang: SupportedLang) => ({
  slug: CUSTOM_THEMES_SLUG,
  label: i18n?.['settings.custom-themes.title']?.[lang],
  type: 'json',
  storage: 'home_server',
  scope: 'user',
  defaultValue: [] as CustomTheme[],
})
