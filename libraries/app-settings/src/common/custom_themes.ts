import { SettingsFieldFactory, SupportedCardinalApp, SupportedLang } from '../types'
import i18n from '../i18n'

export const CUSTOM_THEMES_SLUG = 'custom_themes'

export type CustomTheme = {
  id: string,
  name: string,
  // Which built-in theme this custom theme falls back to for anything
  // outside the manifest (eg. not-yet-exposed tokens).
  base: 'light' | 'dark',
  // A full snapshot of every manifest token's resolved value at the moment
  // this theme was created or last saved - deliberately not sparse, so a
  // theme never silently changes when its source theme is edited later.
  vars: Record<string, string>,
}

export const customThemesFactory: SettingsFieldFactory = (app: SupportedCardinalApp, lang: SupportedLang) => ({
  slug: CUSTOM_THEMES_SLUG,
  label: i18n?.['settings.custom-themes.title']?.[lang],
  type: 'json',
  storage: 'client',
  defaultValue: [] as CustomTheme[],
})
