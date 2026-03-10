import { SettingsFieldFactory, SupportedCardinalApp, SupportedLang } from '../types'
import i18n from '../i18n'

export const CUSTOM_CSS_SLUG = 'custom_css'

export const customCSSFactory: SettingsFieldFactory = (app: SupportedCardinalApp, lang: SupportedLang) => ({
  slug: CUSTOM_CSS_SLUG,
  label: i18n?.['settings.custom-css.title']?.[lang],
  type: 'textArea',
  storage: 'client',
  defaultValue: '',
})
