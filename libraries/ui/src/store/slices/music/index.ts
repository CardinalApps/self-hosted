import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit'
import { DynamicQueueType, QueueType } from '@cardinalapps/types/src/playback-queue'

import { globalActions } from '../../constants/actions'
import play from './thunks/play'
import next from './thunks/next'
import previous from './thunks/previous'

import { Library } from '../../apis/libraries'
import { STORE_KEY, PLAYER, PLAYBACK_STATE } from './constants'

export type QueueItem = {
  mediaType: 'music_track',
  mediaId: string,
  libraries: Library[],
  queueItemId: string,
}

export type ServerQueue = {
  type: QueueType,
  dynamicType: DynamicQueueType,
  queueId: string,
  items?: QueueItem[],
}

export type Player = {
  id: string,
  playerId?: string,
  trackId: string,
  queue: ServerQueue,
  state: string,
  currentPlaybackStartedAt: number,
  initializedAt: number,
  currentSeconds?: number,
  currentQueueItem?: QueueItem,
}

type InitialState = {
  players: {
    [playerId: string]: Player
  }
}

const initialState: InitialState = {
  players: {},
}

type PlayerLoaded = {
  maxConcurrentPlayingPlayers?: number,
  playerId?: string,
}

const audioSlice = createSlice({
  name: STORE_KEY,
  initialState,
  reducers: {
    pause: (state, { payload: playerId }) => {
      state.players[playerId].state = PLAYBACK_STATE.PAUSED
    },
    stop: (state, { payload: id }) => {
      delete state.players[id]
    },
    stopAll: (state) => {
      Object.keys(state.players).forEach((id) => {
        delete state.players[id]
      })
    },
    /**
     * When the audio stream is loaded by Howler
     */
    loaded: (state, action: PayloadAction<PlayerLoaded>) => {
      const { payload } = action
      const { playerId, maxConcurrentPlayingPlayers } = payload

      // If the current state is not loading, then we want to preserve it (for
      // example, when reloading the page and keeping it paused when the audio
      // reloads)
      if (state.players[playerId].state !== PLAYBACK_STATE.LOADING) {
        return
      }

      const oldestOtherPlayersPlayingOrLoading = Object.values(state.players)
        .map((player) => player.state === PLAYBACK_STATE.PLAYING || player.state === PLAYBACK_STATE.LOADING ? { ...player } : null)
        .filter((player) => !!player)
        .filter((player) => player.id !== playerId)
        .sort((a, b) => a?.currentPlaybackStartedAt <= b?.currentPlaybackStartedAt ? -1 : 1)

      // Auto play when no other players are playing
      if (!oldestOtherPlayersPlayingOrLoading.length) {
        state.players[playerId].state = PLAYBACK_STATE.PLAYING
      }
      // Pause other players before starting playback for the loaded player
      else {
        const numOtherPlayersAllowed = maxConcurrentPlayingPlayers - 1
        if (oldestOtherPlayersPlayingOrLoading.length > numOtherPlayersAllowed) {
          const numToStop = oldestOtherPlayersPlayingOrLoading.length - numOtherPlayersAllowed
          for (let i = 0; i < numToStop; i++) {
            const idToPause = oldestOtherPlayersPlayingOrLoading[i].id
            state.players[idToPause].state = PLAYBACK_STATE.PAUSED
          }
        }
        state.players[playerId].state = PLAYBACK_STATE.PLAYING
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(globalActions.RESET, () => {
        return { ...initialState }
      })
      /**
       * Play.
       */
      .addCase(play.fulfilled, (state, { payload }) => {
        const { create, remove, resume, pause } = payload

        // Add new players
        for (const { trackId, generatedPlayerId, now, queue, currentQueueItem } of create) {
          state.players[generatedPlayerId] = {
            ...PLAYER,
            id: generatedPlayerId,
            initializedAt: now,
            currentPlaybackStartedAt: now,
            trackId,
            queue,
            currentQueueItem,
          }
        }

        // Resume players
        for (const { playerId, now } of resume) {
          state.players[playerId].state = PLAYBACK_STATE.PLAYING
          state.players[playerId].currentPlaybackStartedAt = now
        }

        // Pause players
        for (const { playerId } of pause) {
          state.players[playerId].state = PLAYBACK_STATE.PAUSED
        }

        // Remove players
        for (const { playerId } of remove) {
          delete state.players[playerId]
        }
      })
      .addCase(play.rejected, (state, action) => {
        console.log('play.rejected', action)
      })

      /**
       * Next.
       */
      .addCase(next.fulfilled, (state, { payload }) => {
        const { playerId, update, isEndOfQueue } = payload

        if (isEndOfQueue) {
          delete state.players[playerId]
        } else if (update) {
          state.players[playerId] = {
            ...state.players[playerId],
            ...update,
          }
        }
      })
      .addCase(next.rejected, (state, action) => {
        console.log('music.rejected', action)
      })

      /**
       * Previous.
       */
      .addCase(previous.fulfilled, (state, { payload }) => {
        const { playerId, update } = payload

        state.players[playerId] = {
          ...state.players[playerId],
          ...update,
        }
      })
      .addCase(previous.rejected, (state, action) => {
        console.log('previous.rejected', action)
      })
  },
  selectors: {
    current: (state) => state,
    players: (state) => state.players,
    playing: (state) => selectPlaying(state),
    paused: (state) => selectPaused(state),
    loading: (state) => selectLoading(state),
    playerIds: (state) => Object.keys(state.players).join(','),
    playingIds: (state) =>
      Object.values(state.players)
        .filter((track) => track.state === PLAYBACK_STATE.PLAYING)
        .map((track) => track.id)
        .join(','),
    pausedIds: (state) =>
      Object.values(state.players)
        .filter((track) => track.state === PLAYBACK_STATE.PAUSED)
        .map((track) => track.id)
        .join(','),
    loadingIds: (state) =>
      Object.values(state.players)
        .filter((track) => track.state === PLAYBACK_STATE.LOADING)
        .map((track) => track.id)
        .join(','),
  },
})

const selectPlaying = createSelector((state) => state.players, (players) => {
  return Object.values(players)
    .filter((player: Player) => player.state === PLAYBACK_STATE.PLAYING)
})

const selectPaused = createSelector((state) => state.players, (players) => {
  return Object.values(players)
    .filter((player: Player) => player.state === PLAYBACK_STATE.PAUSED)
})

const selectLoading = createSelector((state) => state.players, (players) => {
  return Object.values(players)
    .filter((player: Player) => player.state === PLAYBACK_STATE.LOADING)
})

export const audioSelectors = audioSlice.selectors
export const audioActions = audioSlice.actions

export default audioSlice
