import { SettingsFieldFactory, SupportedCardinalApp, SupportedLang } from '../types'
import i18n from '../i18n'

export const FLOATING_PLAYBACK_SIDEBAR = 'floating_playback_sidebar'

export const floatingPlaybackSidebarFactory: SettingsFieldFactory = (app: SupportedCardinalApp, lang: SupportedLang) => ({
  slug: FLOATING_PLAYBACK_SIDEBAR,
  label: i18n?.['settings.floating-playback-sidebar.label']?.[lang],
  description: i18n?.['settings.floating-playback-sidebar.desc']?.[lang],
  type: 'toggle',
  storage: 'client',
  defaultValue: false,
})
