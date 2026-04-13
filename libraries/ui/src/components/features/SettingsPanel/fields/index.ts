import commonFields from './common'
import musicFields from './music'
//import photosFields from './photos'
import adminServerFields from './admin'

import titleField from '../layout/Title'

import i18n from '../i18n'

/**
 * Fields, grouped by app, into tabs.
 *
 * Each field is a function that returns a frozen field object, customized for
 * the current app.
 */
export const getFields = (app, lang) => {
  // Each tab starts with these fields for all apps
  const defaults = {
    general: [
      //commonFields.lang,
      //commonFields.startPage,
      commonFields.oidcBeta,
      commonFields.enableCustomContextMenu,
      commonFields.developerMode,
    ],
    theme: [
      commonFields.theme,
      commonFields.accentColor,
      commonFields.enableGlass,
    ],
  }

  switch (app) {
    case 'admin':
      return [
        // General settings tab
        {
          tabName: i18n['settings.tab-name-general'][lang],
          tabIcon: 'fas fa-home',
          fields: [
            adminServerFields.serverName,
            ...defaults.general,
            adminServerFields.openAppsInNewTab,
            adminServerFields.autoCheckForUpdates,
            adminServerFields.maxRating,
            adminServerFields.enableHalfRatings,
          ],
        },
        // Theme settings tab
        {
          tabName: i18n['settings.tab-name-theme'][lang],
          tabIcon: 'fas fa-palette',
          fields: [
            ...defaults.theme,
          ],
        },
      ]

    case 'music':
      return [
        // General settings tab
        {
          tabName: i18n['settings.tab-name-general'][lang],
          tabIcon: 'fas fa-home',
          fields: [
            ...defaults.general,
          ],
        },
        // Theme settings tab
        {
          tabName: i18n['settings.tab-name-theme'][lang],
          tabIcon: 'fas fa-palette',
          fields: [
            ...defaults.theme,
          ],
        },
        // Music settings tab
        {
          tabName: i18n['settings.tab-name-music-playback'][lang],
          tabIcon: 'fas fa-headphones-alt',
          fields: [
            titleField(i18n['settings.music.players'][lang]),
            musicFields.audioPlaybackTimeout,
            titleField(i18n['settings.music.multi-player'][lang]),
            musicFields.maxConcurrentAudioStreams,
            musicFields.maxConcurrentPlayingAudioStreams,
            // musicFields.notifications,
          ],
        },
      ]

    case 'photos':
      return [
        // General settings tab
        {
          tabName: i18n['settings.tab-name-general'][lang],
          tabIcon: 'fas fa-home',
          fields: [
            ...defaults.general,
          ],
        },
        // Theme settings tab
        {
          tabName: i18n['settings.tab-name-theme'][lang],
          tabIcon: 'fas fa-palette',
          fields: [
            ...defaults.theme,
          ],
        },
        // People settings tab
        // {
        //   tabName: i18n['settings.tab-name-people'][lang],
        //   tabIcon: 'fas fa-user-circle',
        //   fields: [
        //     photosFields.peopleInPhotosEnabled,
        //   ],
        // },
        // Places settings tab
        // {
        //   tabName: i18n['settings.tab-name-places'][lang],
        //   tabIcon: 'fas fa-map-marked',
        //   fields: [
        //     photosFields.placesInPhotosEnabled,
        //   ],
        // },
      ]

    case 'cinema':
      return [
        // General settings tab
        {
          tabName: i18n['settings.tab-name-general'][lang],
          tabIcon: 'fas fa-home',
          fields: [
            ...defaults.general,
          ],
        },
        // Theme settings tab
        {
          tabName: i18n['settings.tab-name-theme'][lang],
          tabIcon: 'fas fa-palette',
          fields: [
            ...defaults.theme,
          ],
        },
      ]

    case 'books':
      return [
        // General settings tab
        {
          tabName: i18n['settings.tab-name-general'][lang],
          tabIcon: 'fas fa-home',
          fields: [
            ...defaults.general,
          ],
        },
        // Theme settings tab
        {
          tabName: i18n['settings.tab-name-theme'][lang],
          tabIcon: 'fas fa-palette',
          fields: [
            ...defaults.theme,
          ],
        },
      ]

    // Used by kiosk
    default:
      return [
        // General settings tab
        {
          tabName: i18n['settings.tab-name-general'][lang],
          tabIcon: 'fas fa-home',
          fields: [
            ...defaults.general,
          ],
        },
        // Theme settings tab
        {
          tabName: i18n['settings.tab-name-theme'][lang],
          tabIcon: 'fas fa-palette',
          fields: [
            ...defaults.theme,
          ],
        },
      ]
  }
}

/**
 * Returns an object of all fields and their default values for the given app
 * settings. "Default" here means as set by the factory.
 */
export const getDefaultFieldValues = (app, lang = 'en') => {
  const tabs = getFields(app, lang)
  const defaults = {}

  if (!tabs) {
    return defaults
  }

  tabs.forEach((tab) => {
    tab.fields.forEach((field) => {
      const fieldObj = field(app, lang)
      defaults[fieldObj.slug] = fieldObj.defaultValue
    })
  })

  return defaults
}

/**
 * Returns an object of global default settings that are important enough that
 * they should always be set in every app.
 *
 * "Default" here means as set by the factory.
 */
export const getImportantDefaultSettings = () => {
  const langSetting = commonFields.lang()
  const themeSetting = commonFields.theme()
  const accentColorSetting = commonFields.accentColor()

  return {
    [langSetting.slug]: langSetting.defaultValue,
    [themeSetting.slug]: themeSetting.defaultValue,
    [accentColorSetting.slug]: accentColorSetting.defaultValue,
  }
}
