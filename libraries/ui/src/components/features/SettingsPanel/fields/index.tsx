import commonFields from './common'
import musicFields from './music'
//import photosFields from './photos'
import adminServerFields from './admin'

import titleField from '../layout/Title'
import ThemeEditor from '../ThemeEditor'

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
      commonFields.enableGlass,
      commonFields.openAppsInNewTab,
      commonFields.floatingPlaybackSidebar,
      commonFields.enableCustomContextMenu,
      commonFields.developerMode,
    ],
  }

  // The bespoke theme editor tab, identical for all apps
  const themeTab = {
    tabId: 'theme',
    tabName: i18n['settings.tab-name-theme'][lang],
    tabIcon: 'fas fa-swatchbook',
    tabContent: <ThemeEditor app={app} />,
  }

  // General settings tab, identical for all apps. Every field on it is a
  // user-scoped home_server setting, so it applies across every app the
  // user's account touches, not just the one it was changed in.
  const generalTab = {
    // The "Global" section heading is rendered before this tab.
    section: i18n['settings.section-global'][lang],
    tabName: i18n['settings.tab-name-general'][lang],
    tabIcon: 'fas fa-home',
    fields: [
      ...defaults.general,
    ],
  }

  switch (app) {
    case 'admin':
      return [
        generalTab,
        themeTab,
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
        // Authentication settings tab
        {
          tabName: i18n['settings.tab-name-users-access'][lang],
          tabIcon: 'fas fa-user-shield',
          fields: [
            adminServerFields.inactiveSessionTimeout,
          ],
        },
        // Ratings settings tab
        {
          tabName: i18n['settings.tab-name-libraries'][lang],
          tabIcon: 'fas fa-star',
          fields: [
            adminServerFields.maxRating,
            adminServerFields.enableHalfRatings,
          ],
        },
        // Internal Metrics settings tab
        {
          tabId: 'internal-metrics',
          tabName: i18n['settings.tab-name-data-collaboration'][lang],
          tabIcon: 'fas fa-chart-line',
          fields: [
            adminServerFields.telemetry,
          ],
        },
        // Advanced settings tab
        {
          tabId: 'advanced',
          tabName: i18n['settings.tab-name-advanced'][lang],
          tabIcon: 'fas fa-flask',
          fields: [
            adminServerFields.factoryReset,
          ],
        },
      ]

    case 'music':
      return [
        generalTab,
        themeTab,
        // Music settings tab
        {
          // The "Music" section heading is rendered before this tab.
          section: i18n['settings.section-music'][lang],
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
        generalTab,
        themeTab,
        // People settings tab
        // {
        //   // The "Photos" section heading is rendered before this tab.
        //   section: i18n['settings.section-photos'][lang],
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
        generalTab,
        themeTab,
        // Cinema settings tab
        // {
        //   // The "Cinema" section heading is rendered before this tab.
        //   section: i18n['settings.section-cinema'][lang],
        //   tabName: i18n['settings.tab-name-cinema'][lang],
        //   tabIcon: 'fas fa-film',
        //   fields: [],
        // },
      ]

    case 'books':
      return [
        generalTab,
        themeTab,
        // Books settings tab
        // {
        //   // The "Books" section heading is rendered before this tab.
        //   section: i18n['settings.section-books'][lang],
        //   tabName: i18n['settings.tab-name-books'][lang],
        //   tabIcon: 'fas fa-book',
        //   fields: [],
        // },
      ]

    // Used by kiosk
    default:
      return [
        generalTab,
        themeTab,
      ]
  }
}
