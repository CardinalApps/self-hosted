import { SettingsFieldFactory, SupportedCardinalApp, SupportedLang } from '../types'
import i18n from '../i18n'

export const MAX_CONCURRENT_PLAYING_AUDIO_STREAMS = 'max_concurrent_playing_audio_streams'

export const maxConcurrentPlayingAudioStreamsFactory: SettingsFieldFactory = (app: SupportedCardinalApp, lang: SupportedLang) => ({
  slug: MAX_CONCURRENT_PLAYING_AUDIO_STREAMS,
  label: i18n?.['settings.max-concurrent-playing-audio-streams.label']?.[lang],
  description: i18n?.['settings.max-concurrent-playing-audio-streams.desc']?.[lang],
  type: 'number',
  storage: 'home_server',
  defaultValue: 1,
})
