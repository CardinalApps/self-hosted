import { SettingsFieldFactory, SupportedCardinalApp, SupportedLang } from '../types'
import i18n from '../i18n'

export const NOTIFICATIONS_SLUG = 'notifications'

export const notificationsFactory: SettingsFieldFactory = (app: SupportedCardinalApp, lang: SupportedLang) => ({
  slug: NOTIFICATIONS_SLUG,
  label: i18n?.['settings.notifications.title']?.[lang],
  type: 'toggle',
  storage: 'client',
  defaultValue: true,
})
