import { SettingsFieldFactory, SupportedCardinalApp, SupportedLang } from '../types'
import i18n from '../i18n'

export const ENABLE_PEOPLE_IN_PHOTOS_SLUG = 'enable_people_in_photos'

export const enablePeopleInPhotosFactory: SettingsFieldFactory = (app: SupportedCardinalApp, lang: SupportedLang) => ({
  slug: ENABLE_PEOPLE_IN_PHOTOS_SLUG,
  label: i18n?.['settings.people-in-photos.enable']?.[lang],
  type: 'toggle',
  storage: 'home_server',
  defaultValue: true,
  description: i18n?.['settings.people-in-photos.desc']?.[lang],
})
