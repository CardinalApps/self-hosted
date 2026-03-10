import { SettingsFieldFactory, SupportedCardinalApp, SupportedLang } from '../types'
import i18n from '../i18n'

export const AUTO_CHECK_FOR_UPDATES_SLUG = 'auto_check_for_updates'

export const autoCheckForUpdateFactory: SettingsFieldFactory = (app: SupportedCardinalApp, lang: SupportedLang) => ({
  slug: AUTO_CHECK_FOR_UPDATES_SLUG,
  label: i18n?.['settings.updates.auto-check-label']?.[lang],
  type: 'toggle',
  storage: 'home_server',
  defaultValue: true,
})
