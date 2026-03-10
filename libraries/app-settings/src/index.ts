import {
  SettingsFieldFactory,
  SupportedLang,
  SupportedCardinalApp,
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
 * Returns an object of all fields and their default values for the given app
 * settings.
 */
export const getDefaultSettings = (app: SupportedCardinalApp, lang: SupportedLang) => {
  const defaults: Record<string, unknown> = {}
  let fields: Record<string, SettingsFieldFactory> = {}

  switch (app) {
    case 'admin':
      fields = { ...commonFields, ...adminFields }
      break

    case 'music':
      fields = { ...commonFields, ...musicFields }
      break

    case 'photos':
      fields = { ...commonFields, ...photosFields }
      break

    case 'cinema':
      fields = { ...commonFields }
      break
  }

  Object.values(fields).forEach((fieldFactory) => {
    const field = fieldFactory(app, lang)
    defaults[field.slug] = field.defaultValue
  })

  return defaults
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
