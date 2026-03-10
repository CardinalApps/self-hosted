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

export const PLAYER = Object.freeze({
  id: null,
  howlId: null,
  trackId: null,
  state: PLAYBACK_STATE.LOADING,
  initializedAt: null,
  currentPlaybackStartedAt: null,
  type: PLAYBACK_SOURCE_TYPE.MUSIC_TRACK,
})
