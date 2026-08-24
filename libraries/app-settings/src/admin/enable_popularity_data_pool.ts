import { SettingsFieldFactory, SupportedCardinalApp, SupportedLang } from '../types'
import i18n from '../i18n'

export const ENABLE_POPULARITY_DATA_POOL_SLUG = 'enable_popularity_data_pool'

export const enablePopularityDataPoolFactory: SettingsFieldFactory = (app: SupportedCardinalApp, lang: SupportedLang) => ({
  slug: ENABLE_POPULARITY_DATA_POOL_SLUG,
  label: i18n?.['settings.enable-popularity-data-pool.label']?.[lang],
  description: i18n?.['settings.enable-popularity-data-pool.desc']?.[lang],
  type: 'toggle',
  storage: 'home_server',
  defaultValue: false,
})
