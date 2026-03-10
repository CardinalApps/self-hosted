import { SettingsFieldFactory, SupportedCardinalApp, SupportedLang } from '../types'
import i18n from '../i18n'

export const ENABLE_PLACES_IN_PHOTOS_SLUG = 'enable_places_in_photos'

export const enablePlacesInPhotosFactory: SettingsFieldFactory = (app: SupportedCardinalApp, lang: SupportedLang) => ({
  slug: ENABLE_PLACES_IN_PHOTOS_SLUG,
  label: i18n?.['settings.places-in-photos.enable']?.[lang],
  type: 'toggle',
  storage: 'home_server',
  defaultValue: true,
  description: i18n?.['settings.places-in-photos.desc']?.[lang],
})
