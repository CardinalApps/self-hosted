import {
  SettingsFieldFactory,
  SupportedLang,
  SupportedCardinalApp,
  StorageLocation,
} from './types'

import { commonFields } from './common'
import { adminFields } from './admin'
import { musicFields } from './music'
import { photosFields } from './photos'
//import { cinemaFields } from './cinema'

/**
 * The master map of settings and their factory functions.
 */
export const allSettings: Record<string, SettingsFieldFactory> = {
  ...commonFields,
  ...adminFields,
  ...photosFields,
  ...musicFields,
}

export type AllSettingsSlugs =
  keyof typeof commonFields |
  keyof typeof adminFields |
  keyof typeof photosFields |
  keyof typeof musicFields

/**
 * Returns the factory function for the given settings field.
 */
export const getSetting = (slug: AllSettingsSlugs): SettingsFieldFactory | undefined => {
  return allSettings?.[slug]
}

/**
 * Returns the map of field factories that apply to the given app.
 */
const getFieldsForApp = (app: SupportedCardinalApp): Record<string, SettingsFieldFactory> => {
  switch (app) {
    case 'admin':
      return { ...commonFields, ...adminFields }

    case 'music':
      return { ...commonFields, ...musicFields }

    case 'photos':
      return { ...commonFields, ...photosFields }

    case 'cinema':
      return { ...commonFields }

    default:
      return { ...commonFields }
  }
}

/**
 * Returns an object of all fields and their default values for the given app
 * settings. Pass `storage` to only include settings persisted in that location.
 */
export const getDefaultSettings = (
  app: SupportedCardinalApp,
  lang: SupportedLang,
  storage?: StorageLocation,
) => {
  const defaults: Record<string, unknown> = {}

  Object.values(getFieldsForApp(app)).forEach((fieldFactory) => {
    const field = fieldFactory(app, lang)
    if (storage && field.storage !== storage) return
    defaults[field.slug] = field.defaultValue
  })

  return defaults
}

/**
 * Returns the slugs of the given app's settings that are persisted in the given
 * storage location.
 */
export const getStoredSlugs = (
  app: SupportedCardinalApp,
  lang: SupportedLang,
  storage: StorageLocation,
): string[] => {
  return Object.values(getFieldsForApp(app))
    .map((fieldFactory) => fieldFactory(app, lang))
    .filter((field) => field.storage === storage)
    .map((field) => field.slug)
}

/**
 * Returns an object of all fields and their default values for the given app
 * settings.
 */
export const getAllDefaultSettings = (lang: SupportedLang) => {
  return {
    admin: getDefaultSettings('admin', lang),
    music: getDefaultSettings('music', lang),
    photos: getDefaultSettings('photos', lang),
    cinema: getDefaultSettings('cinema', lang),
  }
}


/**
 * Validate a setting slug. If it's valid, the function returns the slug. If
 * it's invalid, it returns false.
 */
export const settingSlug = (slug: AllSettingsSlugs): AllSettingsSlugs | false => {
  if (getSetting(slug)) {
    return slug
  } else {
    return false
  }
}
