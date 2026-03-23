import { SettingsFieldFactory, SupportedCardinalApp, SupportedLang } from '../types'
import i18n from '../i18n'

export const ENABLE_GLASS = 'enable_glass'

export const enableGlassFactory: SettingsFieldFactory = (app: SupportedCardinalApp, lang: SupportedLang) => ({
  slug: ENABLE_GLASS,
  label: i18n?.['settings.enable-glass.label']?.[lang],
  type: 'toggle',
  storage: 'home_server',
  defaultValue: true,
})
