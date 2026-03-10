import { createAsyncThunk } from '@reduxjs/toolkit'
import { Player, QueueItem } from '..'

import { AppDispatch, RootState } from '../../../'

import { PLAYBACK_STATE, STORE_KEY } from '../constants'
import homeServerAPI from '../../../../lib/homeserver/homeServerAPI'
import queryParams from '../../../../lib/net/queryParams'

import { getHowl } from '../../../../hooks/useHowler'

export type PrevArgs = {
  playerId?: string,
}

export type PrevReturn = {
  playerId: string,
  update?: Partial<Player>,
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
  const { playerId } = args
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

  const howl = getHowl(playerId)

  // Reset current track
  if (howl.seek() > 8) {
    howl.seek(0)
    return workToDo
  }

  const [prevQueueItems] = await homeServerAPI<[QueueItem[], number]>(queryParams(`/playback-queues/${player.queue.queueId}/items`, {
    currentQueueItemId: player?.currentQueueItem?.queueItemId,
    trailing: 1,
    includeCurrentItemInReturn: false,
  }))

  const prevQueueItem = prevQueueItems?.[0]

  // Restart first track
  if (!prevQueueItem) {
    howl.seek(0)
    return workToDo
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
