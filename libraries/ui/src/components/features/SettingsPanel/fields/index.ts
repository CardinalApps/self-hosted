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
      commonFields.enableCustomContextMenu,
      commonFields.developerMode,
    ],
    appearance: [
      commonFields.theme,
      commonFields.accentColor,
      commonFields.enableGlass,
      commonFields.customCss,
    ],
  }

  switch (app) {
    case 'admin':
      return [
        // --- Personal preferences (this admin, this device) ---
        // General settings tab (developer_mode lives under Advanced for admin)
        {
          tabName: i18n['settings.tab-name-general'][lang],
          tabIcon: 'fas fa-home',
          fields: [
            commonFields.enableCustomContextMenu,
            adminServerFields.openAppsInNewTab,
          ],
        },
        // Appearance settings tab
        {
          tabName: i18n['settings.tab-name-appearance'][lang],
          tabIcon: 'fas fa-palette',
          fields: [
            ...defaults.appearance,
          ],
        },
        // --- Server administration (system-wide, all users) ---
        // Server settings tab
        {
          // The "Server" section heading is rendered before this tab.
          section: i18n['settings.section-server'][lang],
          tabName: i18n['settings.tab-name-server'][lang],
          tabIcon: 'fas fa-server',
          fields: [
            adminServerFields.serverName,
            adminServerFields.autoCheckForUpdates,
          ],
        },
        // Users & Access settings tab
        {
          tabName: i18n['settings.tab-name-users-access'][lang],
          tabIcon: 'fas fa-user-shield',
          fields: [
            adminServerFields.inactiveSessionTimeout,
          ],
        },
        // Libraries settings tab
        {
          tabName: i18n['settings.tab-name-libraries'][lang],
          tabIcon: 'fas fa-folder-open',
          fields: [
            adminServerFields.maxRating,
            adminServerFields.enableHalfRatings,
          ],
        },
        // Advanced settings tab
        {
          tabName: i18n['settings.tab-name-advanced'][lang],
          tabIcon: 'fas fa-flask',
          fields: [
            commonFields.developerMode,
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
        // Appearance settings tab
        {
          tabName: i18n['settings.tab-name-appearance'][lang],
          tabIcon: 'fas fa-palette',
          fields: [
            ...defaults.appearance,
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
        // Appearance settings tab
        {
          tabName: i18n['settings.tab-name-appearance'][lang],
          tabIcon: 'fas fa-palette',
          fields: [
            ...defaults.appearance,
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
        // Appearance settings tab
        {
          tabName: i18n['settings.tab-name-appearance'][lang],
          tabIcon: 'fas fa-palette',
          fields: [
            ...defaults.appearance,
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
        // Appearance settings tab
        {
          tabName: i18n['settings.tab-name-appearance'][lang],
          tabIcon: 'fas fa-palette',
          fields: [
            ...defaults.appearance,
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
        // Appearance settings tab
        {
          tabName: i18n['settings.tab-name-appearance'][lang],
          tabIcon: 'fas fa-palette',
          fields: [
            ...defaults.appearance,
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
