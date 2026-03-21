import { SettingsFieldFactory, SupportedCardinalApp, SupportedLang } from '../types'
import i18n from '../i18n'

export const AUDIO_PLAYBACK_TIMEOUT = 'audio_playback_timeout'

export const audioPlaybackTimeout: SettingsFieldFactory = (app: SupportedCardinalApp, lang: SupportedLang) => ({
  slug: AUDIO_PLAYBACK_TIMEOUT,
  label: i18n?.['settings.audio-playback-timeout.label']?.[lang],
  description: i18n?.['settings.audio-playback-timeout.desc']?.[lang],
  type: 'number',
  storage: 'home_server',
  defaultValue: 8000,
})
