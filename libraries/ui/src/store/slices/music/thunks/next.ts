import { createAsyncThunk } from '@reduxjs/toolkit'
import { Player, QueueItem } from '..'

import { AppDispatch, RootState } from '../../../'

import { PLAYBACK_STATE, STORE_KEY } from '../constants'
import homeServerAPI from '../../../../lib/homeserver/homeServerAPI'
import queryParams from '../../../../lib/net/queryParams'

export type NextArgs = {
  playerId?: string,

  // Use a track ID to ensure that next() only goes through if this track is
  // currently playing
  fromTrackId?: string,
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

  // Only proceed if we would be going next from the given trackId
  if (args.fromTrackId && state.audio.players[playerId].trackId !== args.fromTrackId) {
    return workToDo
  }

  const player = state.audio.players?.[playerId]

  if (!player) {
    console.error('Invalid player ID')
    return workToDo
  }

  // If we don't have a queue then behave as if we are at the end of a queue
  if (!player?.currentQueueItem?.queueItemId) {
    workToDo.isEndOfQueue = true
    return workToDo
  }

  // If we have a queue then get the next item
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
