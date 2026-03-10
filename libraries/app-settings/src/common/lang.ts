import { SettingsFieldFactory, SupportedCardinalApp, SupportedLang } from '../types'
import i18n from '../i18n'

export const LANG_SLUG = 'lang'

const langs = [
  {
    value: 'en',
    label: 'English',
  },
]

export const langFactory: SettingsFieldFactory = (app: SupportedCardinalApp, lang: SupportedLang) => ({
  slug: LANG_SLUG,
  label: i18n?.['settings.language.title']?.[lang],
  type: 'select',
  storage: 'home_server',
  defaultValue: langs[0].value,
  options: langs,
})
