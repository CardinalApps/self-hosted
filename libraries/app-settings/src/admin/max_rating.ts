import { SettingsFieldFactory, SupportedCardinalApp, SupportedLang } from '../types'
import i18n from '../i18n'

export const MAX_RATING_SLUG = 'max_rating'

export const maxRatingFactory: SettingsFieldFactory = (app: SupportedCardinalApp, lang: SupportedLang) => ({
  slug: MAX_RATING_SLUG,
  label: i18n?.['settings.max-rating.label']?.[lang],
  description: i18n?.['settings.max-rating.desc']?.[lang],
  type: 'number',
  storage: 'home_server',
  defaultValue: 1,
})
