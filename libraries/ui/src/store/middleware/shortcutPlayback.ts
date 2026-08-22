import { createListenerMiddleware } from '@reduxjs/toolkit'

import { shortcutActions } from '../constants/actions'
import { activePlayerId, audioActions } from '../slices/music'
import { PLAYBACK_STATE } from '../slices/music/constants'
import play from '../slices/music/thunks/play'
import next from '../slices/music/thunks/next'
import previous from '../slices/music/thunks/previous'
import { getHowl } from '../../hooks/useHowler'

const shortcutPlaybackMiddleware = createListenerMiddleware()

// How much one press of the volume shortcuts moves the volume, out of a range of 0 to 1
const VOLUME_STEP = 0.1

const playbackShortcuts = [
  shortcutActions.PLAY_PAUSE,
  shortcutActions.PREVIOUS_TRACK,
  shortcutActions.NEXT_TRACK,
  shortcutActions.MUTE,
  shortcutActions.VOLUME_UP,
  shortcutActions.VOLUME_DOWN,
]

/**
 * Carries out the playback shortcuts, which need to pick a player and can end up asking the
 * server for the next track - neither of which a reducer can do. Every app dispatches these,
 * including the ones that never load music, so having no player at all is the normal case.
 */
shortcutPlaybackMiddleware.startListening({
  predicate: (action) => playbackShortcuts.includes(action.type),
  effect: async (action, listenerApi) => {
    const state = listenerApi.getState() as { audio: { players: Record<string, never> } }
    const playerId = activePlayerId(state.audio?.players)

    if (!playerId) {
      return
    }

    const player = state.audio.players[playerId] as { state: string }

    switch (action.type) {
      case shortcutActions.PLAY_PAUSE:
        if (player?.state === PLAYBACK_STATE.PLAYING) {
          listenerApi.dispatch(audioActions.pause(playerId))
        } else {
          listenerApi.dispatch(play({ playerId }))
        }
        break

      case shortcutActions.PREVIOUS_TRACK: {
        // Far enough into the track and `previous` restarts it instead, which needs the position
        const howl = getHowl(playerId)
        const seek = typeof howl?.seek() === 'number' ? (howl.seek() as number) : 0
        const result = await listenerApi.dispatch(previous({ playerId, seek }))

        if (result.payload && 'resetSeek' in result.payload && result.payload.resetSeek) {
          howl?.seek(0)
        }
        break
      }

      case shortcutActions.NEXT_TRACK:
        listenerApi.dispatch(next({ playerId }))
        break

      case shortcutActions.MUTE:
        listenerApi.dispatch(audioActions.toggleMute(playerId))
        break

      case shortcutActions.VOLUME_UP:
        listenerApi.dispatch(audioActions.changeVolume({ playerId, delta: VOLUME_STEP }))
        break

      case shortcutActions.VOLUME_DOWN:
        listenerApi.dispatch(audioActions.changeVolume({ playerId, delta: -VOLUME_STEP }))
        break
    }
  },
})

export default shortcutPlaybackMiddleware
