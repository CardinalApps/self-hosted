import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit'

import { globalActions } from '../../constants/actions'
import play from './thunks/play'
import next from './thunks/next'
import previous from './thunks/previous'

import { Library } from '../../apis/libraries'
import { STORE_KEY, PLAYER, PLAYBACK_STATE, RepeatMode } from './constants'
import { DynamicQueueType, QueueSeedMediaType, QueueType } from '../../apis/playbackQueues'

/**
 * Queue items always arrive from the server in queue order. Their stored position is
 * deliberately not modelled here: it is fractional, so it says nothing about how far
 * into the queue an item sits, and nothing on this end should ever ask.
 */
export type QueueItem = {
  mediaType: 'music_track',
  mediaId: string,
  libraries: Library[],
  queueItemId: string,
}

export type ServerQueue = {
  type: QueueType,
  dynamicType: DynamicQueueType,
  seedMediaType?: QueueSeedMediaType,
  seedMediaId?: string,
  queueId: string,
  items?: QueueItem[],
}

export type Player = {
  id: string,
  playerId?: string,
  trackId: string,
  queue: ServerQueue,
  state: string,
  repeat: RepeatMode,
  rate: number,
  volume: number,
  currentPlaybackStartedAt: number,
  initializedAt: number,
  currentSeconds?: number,
  currentQueueItem?: QueueItem,
  // The volume to come back to when a mute is lifted; absent whenever the player is not muted
  volumeBeforeMute?: number,
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
    // Set how a player behaves when its track ends (loop the track, loop the queue, or off)
    setRepeat: (state, { payload }: PayloadAction<{ playerId: string, repeat: RepeatMode }>) => {
      const player = state.players[payload.playerId]
      if (player) {
        player.repeat = payload.repeat
      }
    },
    // Set a player's playback rate; the driver is kept in step by the AudioPlayer
    setRate: (state, { payload }: PayloadAction<{ playerId: string, rate: number }>) => {
      const player = state.players[payload.playerId]
      if (player) {
        player.rate = payload.rate
      }
    },
    // Set a player's volume (0..1); the driver is kept in step by the AudioPlayer
    setVolume: (state, { payload }: PayloadAction<{ playerId: string, volume: number }>) => {
      const player = state.players[payload.playerId]
      if (player) {
        player.volume = payload.volume
      }
    },
    // Step a player's volume, clamped to the range the volume control offers
    changeVolume: (state, { payload }: PayloadAction<{ playerId: string, delta: number }>) => {
      const player = state.players[payload.playerId]
      if (player) {
        player.volume = Math.min(1, Math.max(0, (player.volume ?? 1) + payload.delta))
        // A volume the user chose replaces the one a mute was going to restore
        delete player.volumeBeforeMute
      }
    },
    /*
     * Silence a player and remember where its volume was, or put that volume back. A player
     * already at zero without a remembered volume was silenced by hand, so unmuting it has
     * nothing to restore and goes to full.
     */
    toggleMute: (state, { payload: playerId }: PayloadAction<string>) => {
      const player = state.players[playerId]
      if (!player) {
        return
      }

      if (player.volume === 0) {
        player.volume = player.volumeBeforeMute ?? 1
        delete player.volumeBeforeMute
      } else {
        player.volumeBeforeMute = player.volume ?? 1
        player.volume = 0
      }
    },
    // Jump a player to another item in its own queue. Loading state plus the new track ID
    // is what triggers useHowler() to swap the audio, same as advancing the queue.
    playQueueItem: (state, { payload }: PayloadAction<{ playerId: string, queueItem: QueueItem, now: number }>) => {
      const player = state.players[payload.playerId]
      if (player) {
        player.state = PLAYBACK_STATE.LOADING
        player.trackId = payload.queueItem.mediaId
        player.currentQueueItem = payload.queueItem
        player.currentPlaybackStartedAt = payload.now
      }
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
        .filter((player) => player.state === PLAYBACK_STATE.PLAYING)
        .map((player) => player.trackId)
        .join(','),
    pausedIds: (state) =>
      Object.values(state.players)
        .filter((player) => player.state === PLAYBACK_STATE.PAUSED)
        .map((player) => player.trackId)
        .join(','),
    loadingIds: (state) =>
      Object.values(state.players)
        .filter((player) => player.state === PLAYBACK_STATE.LOADING)
        .map((player) => player.trackId)
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

/**
 * The player a playback shortcut acts on.
 *
 * Follows the same rule as the visible player: whatever the user can hear wins, and the newest
 * one breaks the tie. That rule lives in a hook for the players on screen, which holds local
 * state a listener middleware cannot read, so it is applied to the store directly here.
 */
export const activePlayerId = (players: Record<string, Player>): string | undefined => {
  const all = Object.values(players || {})
  const playing = all.filter((player) => player.state === PLAYBACK_STATE.PLAYING)
  const newest = (candidates: Player[], key: keyof Player) => (
    [...candidates].sort((a, b) => Number(b[key] ?? 0) - Number(a[key] ?? 0))[0]
  )

  if (playing.length) {
    return newest(playing, 'currentPlaybackStartedAt')?.id
  }

  return newest(all, 'initializedAt')?.id
}

export const audioSelectors = audioSlice.selectors
export const audioActions = audioSlice.actions

export default audioSlice
