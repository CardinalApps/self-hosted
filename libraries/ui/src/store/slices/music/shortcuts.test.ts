import { describe, it, expect } from 'vitest'

import audioSlice, { audioActions, activePlayerId } from './index'
import type { Player } from './index'
import { PLAYBACK_STATE } from './constants'

const reducer = audioSlice.reducer

const player = (overrides: Partial<Player>): Player => ({
  id: 'a',
  trackId: 't',
  queue: undefined,
  state: PLAYBACK_STATE.PAUSED,
  repeat: 'off',
  rate: 1,
  volume: 1,
  currentPlaybackStartedAt: 0,
  initializedAt: 0,
  ...overrides,
} as Player)

const stateWith = (players: Player[]) => ({
  players: Object.fromEntries(players.map((one) => [one.id, one])),
})

describe('activePlayerId', () => {
  it('has no player to act on when nothing is loaded', () => {
    expect(activePlayerId({})).toBeUndefined()
  })

  it('acts on the newest player when none are playing', () => {
    expect(activePlayerId(stateWith([
      player({ id: 'old', initializedAt: 1 }),
      player({ id: 'new', initializedAt: 2 }),
    ]).players)).toBe('new')
  })

  // Matches the visible player rule: a playing stream always wins over an idle one, however
  // recently the idle one was created, so a shortcut acts on the music the user can hear.
  it('acts on a playing player even when a newer one is idle', () => {
    expect(activePlayerId(stateWith([
      player({ id: 'playing', initializedAt: 1, state: PLAYBACK_STATE.PLAYING, currentPlaybackStartedAt: 5 }),
      player({ id: 'idle', initializedAt: 9 }),
    ]).players)).toBe('playing')
  })

  it('acts on the most recently started of several playing players', () => {
    expect(activePlayerId(stateWith([
      player({ id: 'first', state: PLAYBACK_STATE.PLAYING, currentPlaybackStartedAt: 5 }),
      player({ id: 'second', state: PLAYBACK_STATE.PLAYING, currentPlaybackStartedAt: 7 }),
    ]).players)).toBe('second')
  })
})

describe('changeVolume', () => {
  it('steps a player volume by the given amount', () => {
    const state = reducer(stateWith([player({ volume: 0.5 })]), audioActions.changeVolume({ playerId: 'a', delta: 0.1 }))

    expect(state.players.a.volume).toBeCloseTo(0.6)
  })

  it('stops at the ends of the range', () => {
    const up = reducer(stateWith([player({ volume: 0.95 })]), audioActions.changeVolume({ playerId: 'a', delta: 0.1 }))
    const down = reducer(stateWith([player({ volume: 0.05 })]), audioActions.changeVolume({ playerId: 'a', delta: -0.1 }))

    expect(up.players.a.volume).toBe(1)
    expect(down.players.a.volume).toBe(0)
  })

  // A shortcut can outlive the player it was aimed at, so a missing player is a no-op
  it('ignores a player that is no longer loaded', () => {
    const state = reducer(stateWith([player({})]), audioActions.changeVolume({ playerId: 'gone', delta: 0.1 }))

    expect(state.players.a.volume).toBe(1)
  })

  it('leaves a muted player muted', () => {
    const muted = reducer(stateWith([player({ volume: 0.4 })]), audioActions.toggleMute('a'))
    const state = reducer(muted, audioActions.changeVolume({ playerId: 'a', delta: 0.1 }))

    expect(state.players.a.volume).toBeCloseTo(0.1)
    expect(state.players.a.volumeBeforeMute).toBeUndefined()
  })
})

describe('toggleMute', () => {
  it('silences the player and remembers the volume to come back to', () => {
    const state = reducer(stateWith([player({ volume: 0.4 })]), audioActions.toggleMute('a'))

    expect(state.players.a.volume).toBe(0)
    expect(state.players.a.volumeBeforeMute).toBe(0.4)
  })

  it('restores the volume it was muted at', () => {
    const muted = reducer(stateWith([player({ volume: 0.4 })]), audioActions.toggleMute('a'))
    const state = reducer(muted, audioActions.toggleMute('a'))

    expect(state.players.a.volume).toBe(0.4)
    expect(state.players.a.volumeBeforeMute).toBeUndefined()
  })

  // Unmuting something that was dragged to silence by hand has no remembered volume to use
  it('unmutes to full volume when it was never muted by shortcut', () => {
    const state = reducer(stateWith([player({ volume: 0 })]), audioActions.toggleMute('a'))

    expect(state.players.a.volume).toBe(1)
  })
})
