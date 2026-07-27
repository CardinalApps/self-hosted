export const RESET_APP_QUERY_PARAM = 'reset-app'

/**
 * Whether the URL is requesting a full app reset. This is a last-resort escape hatch for a
 * corrupted store, so it must not depend on the cached store, Redux, or React ever mounting.
 */
export default function isResetAppRequested(): boolean {
  return new URLSearchParams(window.location.search).has(RESET_APP_QUERY_PARAM)
}
