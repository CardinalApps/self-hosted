import { SettingsFieldFactory, SupportedCardinalApp, SupportedLang } from '../types'
import i18n from '../i18n'

export const ENABLE_HALF_RATINGS_SLUG = 'enable_half_ratings'

export const enableHalfRatingsFactory: SettingsFieldFactory = (app: SupportedCardinalApp, lang: SupportedLang) => ({
  slug: ENABLE_HALF_RATINGS_SLUG,
  label: i18n?.['settings.enable-half-ratings.label']?.[lang],
  description: i18n?.['settings.enable-half-ratings.desc']?.[lang],
  type: 'toggle',
  storage: 'home_server',
  defaultValue: false,
})
