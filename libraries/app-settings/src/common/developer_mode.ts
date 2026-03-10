import { SettingsFieldFactory, SupportedCardinalApp, SupportedLang } from '../types'
import i18n from '../i18n'

export const DEVELOPER_MODE_SLUG = 'developer_mode'

export const developerModeFactory: SettingsFieldFactory = (app: SupportedCardinalApp, lang: SupportedLang) => ({
  slug: DEVELOPER_MODE_SLUG,
  label: i18n?.['settings.developer.enable-label']?.[lang],
  type: 'toggle',
  storage: 'client',
  defaultValue: false,
})
