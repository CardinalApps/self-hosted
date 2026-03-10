import { createAsyncThunk } from '@reduxjs/toolkit'
import { Player, QueueItem } from '..'

import { AppDispatch, RootState } from '../../../'

import { PLAYBACK_STATE, STORE_KEY } from '../constants'
import homeServerAPI from '../../../../lib/homeserver/homeServerAPI'
import queryParams from '../../../../lib/net/queryParams'

export type NextArgs = {
  playerId?: string,
}

export type NextReturn = {
  playerId: string,
  update?: Partial<Player>,
  isEndOfQueue: boolean,
}

/**
 * Play the next audio track in the queue.
 */
const next = createAsyncThunk<
  NextReturn,
  NextArgs,
  {
    dispatch: AppDispatch,
    state: RootState,
    rejectValue: { error: string },
  }
>(`${STORE_KEY}/next`, async (args, thunkAPI): Promise<NextReturn> => {
  const { playerId } = args
  const state = thunkAPI.getState()

  const workToDo: NextReturn = {
    playerId,
    update: null,
    isEndOfQueue: false,
  }

  const player = state.audio.players?.[playerId]

  if (!player) {
    console.error('Invalid player ID')
    return workToDo
  }

  if (!player?.currentQueueItem?.queueItemId) {
    console.error('Cannot go to next item because there is no queue')
    return workToDo
  }

  const [nextQueueItems] = await homeServerAPI<[QueueItem[], number]>(queryParams(`/playback-queues/${player.queue.queueId}/items`, {
    currentQueueItemId: player?.currentQueueItem?.queueItemId,
    leading: 1,
    includeCurrentItemInReturn: false,
  }))

  // End of queue
  if (!nextQueueItems?.length) {
    workToDo.isEndOfQueue = true
    return workToDo
  }

  const nextQueueItem = nextQueueItems?.[0]

  // New track, same queue.
  // Changing the state to "loading" and setting a new track ID
  // will trigger useHowler() to update the audio playback.
  workToDo.update = {
    id: playerId,
    state: PLAYBACK_STATE.LOADING,
    trackId: nextQueueItem?.mediaId,
    currentQueueItem: nextQueueItem,
    currentPlaybackStartedAt: Date.now(),
  }

  return workToDo
})

export default next
