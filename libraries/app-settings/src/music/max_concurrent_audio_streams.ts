import { SettingsFieldFactory, SupportedCardinalApp, SupportedLang } from '../types'
import i18n from '../i18n'

export const MAX_CONCURRENT_AUDIO_STREAMS = 'max_concurrent_audio_streams'

export const maxConcurrentAudioStreamsFactory: SettingsFieldFactory = (app: SupportedCardinalApp, lang: SupportedLang) => ({
  slug: MAX_CONCURRENT_AUDIO_STREAMS,
  label: i18n?.['settings.max-concurrent-audio-streams.label']?.[lang],
  description: i18n?.['settings.max-concurrent-audio-streams.desc']?.[lang],
  type: 'number',
  storage: 'home_server',
  defaultValue: 1,
})
