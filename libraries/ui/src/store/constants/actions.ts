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
