import { SettingsFieldFactory, SupportedCardinalApp, SupportedLang } from '../types'
import i18n from '../i18n'

export const TELEMETRY_SLUG = 'telemetry'

export const telemetryFactory: SettingsFieldFactory = (app: SupportedCardinalApp, lang: SupportedLang) => ({
  slug: TELEMETRY_SLUG,
  label: i18n?.['settings.telemetry.label']?.[lang],
  type: 'toggle',
  storage: 'home_server',
  defaultValue: true,
  description: i18n?.['settings.telemetry.desc']?.[lang],
})
