import { MAX_CONCURRENT_AUDIO_STREAMS, maxConcurrentAudioStreamsFactory } from './max_concurrent_audio_streams'
import { MAX_CONCURRENT_PLAYING_AUDIO_STREAMS, maxConcurrentPlayingAudioStreamsFactory } from './max_concurrent_playing_audio_streams'

export const musicFields = {
  [MAX_CONCURRENT_AUDIO_STREAMS]: maxConcurrentAudioStreamsFactory,
  [MAX_CONCURRENT_PLAYING_AUDIO_STREAMS]: maxConcurrentPlayingAudioStreamsFactory,
}
