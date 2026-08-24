/**
 * Globals.
 */
export const globalActions = {
  'RESET': 'reset',
}

/**
 * These actions are dispatched by the Media Server, and flow into the app via an
 * EventSource listener.
 */
export const sseActions = {
  FACTORY_RESET: 'sse/factory_reset',
}

/**
 * These actions are dispatched by the keyboard shortcut listener in AppBase. Slices react to
 * them the same way they react to server-sent events, and anything that cannot be done in a
 * reducer is picked up by middleware.
 */
export const shortcutActions = {
  OPEN_SETTINGS: 'shortcut/open-settings',
  TOGGLE_NAV_SIDEBAR: 'shortcut/toggle-nav-sidebar',
  TOGGLE_PLAYBACK_SIDEBAR: 'shortcut/toggle-playback-sidebar',
  PLAY_PAUSE: 'shortcut/play-pause',
  PREVIOUS_TRACK: 'shortcut/previous-track',
  NEXT_TRACK: 'shortcut/next-track',
  MUTE: 'shortcut/mute',
  VOLUME_UP: 'shortcut/volume-up',
  VOLUME_DOWN: 'shortcut/volume-down',
}
