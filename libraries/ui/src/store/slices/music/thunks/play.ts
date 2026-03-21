import { createAsyncThunk } from '@reduxjs/toolkit'
import { getSetting } from '@cardinalapps/app-settings/src'
import { SupportedLang } from '@cardinalapps/app-settings/src/types'
import { v4 as uuid } from 'uuid'
import { QueueType, DynamicQueueType } from '@cardinalapps/types/src/playback-queue'
import { QueueItem, ServerQueue } from '..'

import { AppDispatch, RootState } from '../../../'

import { PLAYBACK_STATE, STORE_KEY } from '../constants'
import homeServerAPI from '../../../../lib/homeserver/homeServerAPI'

export type PlayArgs = {
  trackIds?: string[],
  playerId?: string,
  queueType?: QueueType
  dynamicQueueType?: DynamicQueueType,
  queueName?: string,
}

export type PlayReturn = {
  create: Array<{
    trackId: string,
    generatedPlayerId: string,
    now: number,
    queue: ServerQueue,
    currentQueueItem?: QueueItem,
  }>,
  pause: Array<{
    playerId?: string,
  }>,
  resume: Array<{
    playerId?: string,
    now: number,
  }>,
  remove: Array<{
    playerId?: string,
  }>,
}

/**
 * Play music. This is the general "play" button for all music playback, and it
 * can do many different things depending on the current state of the app.
 * 
 *  1. If the track is already loaded and paused, resume it
 *  2. If the track is not loaded:
 *    2.1 Create the queue on the server
 *    2.2 Create a new player for the queue
 *  3. If at max concurrent players, remove the oldest one(s)
 *  4. If at max *playing* players, pause the oldest ones
 *  5. Return the list of state updates to be performed by the reducer
 */
const play = createAsyncThunk<
  PlayReturn,
  PlayArgs,
  {
    dispatch: AppDispatch,
    state: RootState,
    rejectValue: { error: string },
  }
>(`${STORE_KEY}/play`, async (args, thunkAPI): Promise<PlayReturn> => {
  const {
    trackIds = [],
    playerId,
    queueType = 'static',
    dynamicQueueType,
  } = args
  const state = thunkAPI.getState()
  const lang = state.settings?.current?.lang

  const workToDo: PlayReturn = {
    create: [],
    pause: [],
    resume: [],
    remove: [],
  }

  if (queueType === 'dynamic' && !dynamicQueueType) {
    console.error('Missing dynamic queue type')
    return workToDo
  }

  if (queueType === 'static' && !trackIds.length && !playerId) {
    console.error('Missing trackIds or playerId for static queue')
    return workToDo
  }

  let resolvedPlayerId

  // Use the given player ID
  if (playerId) {
    resolvedPlayerId = playerId
  }
  // Look for a player with the given track ID
  else if (!playerId && trackIds[0]) {
    const player = Object.values(state.audio.players).find((player) => player.trackId === trackIds[0])
    if (player) {
      resolvedPlayerId = player.id
    }
  }

  // When no player exists, create a new one
  if (!resolvedPlayerId) {
    let trackIdToPlay = trackIds[0]
    let currentQueueItem: QueueItem = null
    let queue

    // Maybe create a queue
    if (queueType) {
      const currentLibraries = state.library.current
      const serverQueue = await homeServerAPI<ServerQueue>('/playback-queues', 'POST', {
        body: {
          type: queueType,
          ...(dynamicQueueType ? { dynamicType: dynamicQueueType } : {}),
          ...(currentLibraries?.length
            ? { libraries: currentLibraries.map((id) => ({ libraryId: id })) }
            : {}
          ),
          ...(trackIds.length
            ? { staticItems: trackIds }
            : {}
          ),
        },
      })

      // Now kith (I wrote this on valentines day)
      queue = serverQueue

      // Play the first item in the queue
      currentQueueItem = serverQueue?.items?.[0]
      if (currentQueueItem && currentQueueItem?.mediaType === 'music_track' && currentQueueItem?.mediaId) {
        trackIdToPlay = currentQueueItem?.mediaId
      } else {
        console.error('Could not start playback because the first item in the queue is either missing or not a music track.', currentQueueItem)
      }

      // Remove queue items; they are fundementally a server-side feature and we
      // do not need the whole queue in the store
      if ('items' in queue) {
        delete queue.items
      }
    }

    workToDo.create?.push({
      trackId: trackIdToPlay,
      queue,
      currentQueueItem,
      generatedPlayerId: uuid(),
      now: Date.now(),
    })
  }

  // If the player exists and is paused, resume it
  if (resolvedPlayerId && state.audio.players?.[resolvedPlayerId] && state.audio.players?.[resolvedPlayerId].state === PLAYBACK_STATE.PAUSED) {
    workToDo.resume?.push({
      playerId: resolvedPlayerId,
      now: Date.now(),
    })
  }

  // If we are at the max concurrent players, remove the oldest ones
  const numPlayers = Object.values(state.audio.players).length + workToDo.create.length
  const maxConcurrentPlayers = Number(state.settings.current[getSetting('max_concurrent_audio_streams')('music', lang as SupportedLang).slug])

  if (numPlayers > maxConcurrentPlayers) {
    const inOrderOfOldest = Object.values(state.audio.players).sort((a, b) => a?.initializedAt <= b?.initializedAt ? -1 : 1)
    const numToStop = numPlayers - maxConcurrentPlayers
    for (let i = 0; i < numToStop; i++) {
      const idToStop = inOrderOfOldest[i].id
      workToDo.remove?.push({ playerId: idToStop })
    }
  }

  // If we are at the max concurrent *playing* players, pause the oldest ones
  const oldestOtherPlayersPlayingOrLoading = Object.values(state.audio.players)
    .map((player) => player.state === PLAYBACK_STATE.PLAYING || player.state === PLAYBACK_STATE.LOADING ? { ...player } : null)
    .filter((player) => !!player)
    .sort((a, b) => a?.currentPlaybackStartedAt <= b?.currentPlaybackStartedAt ? -1 : 1)

  const maxConcurrentPlayingPlayers = Number(state.settings.current[getSetting('max_concurrent_playing_audio_streams')('music', lang as SupportedLang).slug])
  const numOtherPlayersAllowed = maxConcurrentPlayingPlayers - 1

  if (oldestOtherPlayersPlayingOrLoading.length > numOtherPlayersAllowed) {
    const numToStop = oldestOtherPlayersPlayingOrLoading.length - numOtherPlayersAllowed
    for (let i = 0; i < numToStop; i++) {
      const idToPause = oldestOtherPlayersPlayingOrLoading[i].id
      workToDo.pause?.push({ playerId: idToPause })
    }
  }

  return workToDo
})

export default play
