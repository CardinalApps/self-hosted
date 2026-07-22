import { createListenerMiddleware } from '@reduxjs/toolkit'

import { musicTracksApi, MusicTrackWaveformType } from '../../../apis/musicTracks'

type WaveformReadyPayload = {
  musicTrackId: string,
  waveform: MusicTrackWaveformType,
}

const sseWaveformReadyMiddleware = createListenerMiddleware()

/**
 * When the server finishes generating a waveform, the data rides along in the
 * event, so insert it straight into the RTK cache that the player reads from.
 */
sseWaveformReadyMiddleware.startListening({
  predicate: (action) => {
    return action.type === 'sse/music.waveform_ready'
  },
  effect: async (action, listenerApi) => {
    const payload = (action as { payload?: WaveformReadyPayload }).payload

    if (!payload?.musicTrackId || !payload?.waveform) {
      return
    }

    listenerApi.dispatch(
      musicTracksApi.util.upsertQueryData(
        'getMusicTrackWaveform',
        { id: payload.musicTrackId },
        payload.waveform,
      ),
    )
  },
})

export default sseWaveformReadyMiddleware
