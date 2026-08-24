import { describe, it, expect } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'

import shortcutPlaybackMiddleware from './shortcutPlayback'
import audioSlice from '../slices/music'
import { PLAYBACK_STATE } from '../slices/music/constants'
import { shortcutActions } from '../constants/actions'

const player = (overrides = {}) => ({
  id: 'a',
  trackId: 't',
  state: PLAYBACK_STATE.PAUSED,
  repeat: 'off',
  rate: 1,
  volume: 1,
  currentPlaybackStartedAt: 0,
  initializedAt: 0,
  ...overrides,
})

/*
 * The middleware answers a shortcut by dispatching playback work, some of which is a thunk that
 * would go to the network. The recorder sits between the listener and the thunk middleware so
 * everything it dispatches can be read back without any of it running.
 */
const testStore = (players = {}) => {
  const dispatched: unknown[] = []

  const recorder = () => (next) => (action) => {
    dispatched.push(action)
    return typeof action === 'function' ? undefined : next(action)
  }

  const store = configureStore({
    reducer: { audio: audioSlice.reducer },
    preloadedState: { audio: { players } },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware()
      .prepend(shortcutPlaybackMiddleware.middleware, recorder),
  })

  return { store, dispatched }
}

const types = (dispatched: unknown[]) => dispatched
  .filter((action) => typeof action === 'object')
  .map((action) => (action as { type: string }).type)

describe('shortcutPlayback middleware', () => {
  it('pauses the playing music', async () => {
    const { store, dispatched } = testStore({ a: player({ state: PLAYBACK_STATE.PLAYING }) })

    await store.dispatch({ type: shortcutActions.PLAY_PAUSE })

    expect(types(dispatched)).toContain('audio/pause')
  })

  it('resumes paused music with the play thunk', async () => {
    const { store, dispatched } = testStore({ a: player({ state: PLAYBACK_STATE.PAUSED }) })

    await store.dispatch({ type: shortcutActions.PLAY_PAUSE })

    expect(types(dispatched)).not.toContain('audio/pause')
    expect(dispatched.some((action) => typeof action === 'function')).toBe(true)
  })

  it('mutes and steps the volume of the player being listened to', async () => {
    const { store } = testStore({
      quiet: player({ id: 'quiet', initializedAt: 9 }),
      loud: player({ id: 'loud', state: PLAYBACK_STATE.PLAYING, currentPlaybackStartedAt: 1, volume: 0.5 }),
    })

    await store.dispatch({ type: shortcutActions.VOLUME_DOWN })
    expect(store.getState().audio.players.loud.volume).toBeCloseTo(0.4)
    expect(store.getState().audio.players.quiet.volume).toBe(1)

    await store.dispatch({ type: shortcutActions.MUTE })
    expect(store.getState().audio.players.loud.volume).toBe(0)

    await store.dispatch({ type: shortcutActions.VOLUME_UP })
    expect(store.getState().audio.players.loud.volume).toBeCloseTo(0.1)
  })

  // Every app carries the bindings, including the ones that never load a player
  it('does nothing when there is no music loaded', async () => {
    const { store, dispatched } = testStore({})

    await store.dispatch({ type: shortcutActions.PLAY_PAUSE })
    await store.dispatch({ type: shortcutActions.NEXT_TRACK })
    await store.dispatch({ type: shortcutActions.MUTE })

    expect(types(dispatched)).toEqual([
      shortcutActions.PLAY_PAUSE,
      shortcutActions.NEXT_TRACK,
      shortcutActions.MUTE,
    ])
  })

  it('ignores actions that are not playback shortcuts', async () => {
    const { store, dispatched } = testStore({ a: player({ state: PLAYBACK_STATE.PLAYING }) })

    await store.dispatch({ type: shortcutActions.OPEN_SETTINGS })

    expect(types(dispatched)).toEqual([shortcutActions.OPEN_SETTINGS])
  })
})
