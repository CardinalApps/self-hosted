export const STORE_KEY = 'audio' as const
export const CACHED_SEEK_SESSION_STORAGE_KEY = '@cardinalapps/music_seek_cache' as const

export const PLAYBACK_STATE = Object.freeze({
  PLAYING: 'playing',
  PAUSED: 'paused',
  LOADING: 'loading',
  ERRORED: 'errored',
})

export const PLAYBACK_SOURCE_TYPE = Object.freeze({
  MUSIC_TRACK: 'music_track',
})

// How a player behaves when the current track ends: keep looping this one track,
// loop back to the top of the queue after the last item, or stop (the default).
export const REPEAT_MODE = Object.freeze({
  OFF: 'off',
  QUEUE: 'queue',
  TRACK: 'track',
} as const)

export type RepeatMode = typeof REPEAT_MODE[keyof typeof REPEAT_MODE]

export const PLAYER = Object.freeze({
  id: null,
  howlId: null,
  trackId: null,
  state: PLAYBACK_STATE.LOADING,
  repeat: REPEAT_MODE.OFF,
  initializedAt: null,
  currentPlaybackStartedAt: null,
  type: PLAYBACK_SOURCE_TYPE.MUSIC_TRACK,
})
