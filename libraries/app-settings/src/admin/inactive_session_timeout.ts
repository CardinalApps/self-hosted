import { SettingsFieldFactory, SupportedCardinalApp, SupportedLang } from '../types'
import i18n from '../i18n'

export const INACTIVE_SESSION_TIMEOUT_SLUG = 'inactive_session_timeout'

const options = [
  { value: 'session', label: 'Session' },
  { value: '15m', label: '15 minutes' },
  { value: '1h', label: '1 hour' },
  { value: '12h', label: '12 hours' },
  { value: '1d', label: '1 day' },
  { value: '3d', label: '3 days' },
  { value: '7d', label: '7 days' },
  { value: '14d', label: '14 days' },
  { value: '30d', label: '30 days' },
]

export const inactiveSessionTimeoutFactory: SettingsFieldFactory = (_app: SupportedCardinalApp, lang: SupportedLang) => ({
  slug: INACTIVE_SESSION_TIMEOUT_SLUG,
  label: i18n?.['settings.inactive-session-timeout.label']?.[lang],
  description: i18n?.['settings.inactive-session-timeout.desc']?.[lang],
  type: 'select',
  storage: 'home_server',
  defaultValue: '7d',
  options,
})
