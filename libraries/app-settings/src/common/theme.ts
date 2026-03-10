import { SettingsFieldFactory, SupportedCardinalApp, SupportedLang } from '../types'
import i18n from '../i18n'

export const THEME_SLUG = 'theme'

export const themeFactory: SettingsFieldFactory = (app: SupportedCardinalApp, lang: SupportedLang) => ({
  slug: THEME_SLUG,
  label: i18n?.['settings.theme.title']?.[lang],
  type: 'select',
  storage: 'home_server',
  defaultValue: 'light',
  options: {
    'light': i18n['settings.theme.option.light']['en'],
    'dark': i18n['settings.theme.option.dark']['en'],
  },
})
