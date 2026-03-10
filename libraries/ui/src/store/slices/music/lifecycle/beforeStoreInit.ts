import { PLAYBACK_STATE } from '../constants'
import { RootState } from '../../..'

export default function beforeStoreInit(state: RootState) {
  // Pause all audio
  Object.values(state.audio.players).forEach((player) => {
    if (player.state === PLAYBACK_STATE.PLAYING) {
      state.audio.players[player.id].state = PLAYBACK_STATE.PAUSED
    }
  })
}
