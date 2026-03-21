import { MAX_CONCURRENT_AUDIO_STREAMS, maxConcurrentAudioStreamsFactory } from './max_concurrent_audio_streams'
import { MAX_CONCURRENT_PLAYING_AUDIO_STREAMS, maxConcurrentPlayingAudioStreamsFactory } from './max_concurrent_playing_audio_streams'
import { AUDIO_PLAYBACK_TIMEOUT, audioPlaybackTimeout } from './audio_playback_timeout'

export const musicFields = {
  [AUDIO_PLAYBACK_TIMEOUT]: audioPlaybackTimeout,
  [MAX_CONCURRENT_AUDIO_STREAMS]: maxConcurrentAudioStreamsFactory,
  [MAX_CONCURRENT_PLAYING_AUDIO_STREAMS]: maxConcurrentPlayingAudioStreamsFactory,
}
