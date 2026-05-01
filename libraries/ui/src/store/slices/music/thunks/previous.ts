import { createAsyncThunk } from '@reduxjs/toolkit'
import { Player, QueueItem } from '..'

import { AppDispatch, RootState } from '../../../'

import { PLAYBACK_STATE, STORE_KEY } from '../constants'
import homeServerAPI from '../../../../lib/homeserver/homeServerAPI'
import queryParams from '../../../../lib/net/queryParams'

export type PrevArgs = {
  playerId?: string,
  seek?: number,
}

export type PrevReturn = {
  playerId: string,
  update?: Partial<Player>,

  /**
   * The logic for whether we should reset the seek to 0 or actually go 
   * back a track must execute outside of this file beacuse this file is 
   * used by both regular React (web) and React Native, and they use different
   * audio drivers (Howler vs react-native-audio-player), and these drivers are
   * where the current seek value is stored.
   */
  resetSeek?: boolean,
}

/**
 * Play the previous audio track in the queue, or restart the current track.
 */
const previous = createAsyncThunk<
  PrevReturn,
  PrevArgs,
  {
    dispatch: AppDispatch,
    state: RootState,
    rejectValue: { error: string },
  }
>(`${STORE_KEY}/previous`, async (args, thunkAPI): Promise<PrevReturn> => {
  const { playerId, seek = 0 } = args
  const state = thunkAPI.getState()

  const workToDo: PrevReturn = {
    playerId,
    update: null,
  }

  const player = state.audio.players?.[playerId]

  if (!player) {
    console.error('Invalid player ID')
    return workToDo
  }

  if (!player?.currentQueueItem?.queueItemId) {
    console.error('Cannot go to previous item because there is no queue')
    return workToDo
  }

  // Reset current track when clicking before a certain threshold
  if (seek > 8) {
    return { ...workToDo, resetSeek: true }
  }

  const [prevQueueItems] = await homeServerAPI<[QueueItem[], number]>(queryParams(`/playback-queues/${player.queue.queueId}/items`, {
    currentQueueItemId: player?.currentQueueItem?.queueItemId,
    trailing: 1,
    includeCurrentItemInReturn: false,
  }))

  const prevQueueItem = prevQueueItems?.[0]

  if (!prevQueueItem) {
    return { ...workToDo, resetSeek: true }
  }

  // New (previous) track, same queue.
  // Changing the state to "loading" and setting a new track ID
  // will trigger useHowler() to update the audio playback.
  workToDo.update = {
    id: playerId,
    state: PLAYBACK_STATE.LOADING,
    trackId: prevQueueItem?.mediaId,
    currentQueueItem: prevQueueItem,
    currentPlaybackStartedAt: Date.now(),
  }

  return workToDo
})

export default previous
