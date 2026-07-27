import { RESET_APP_QUERY_PARAM } from './isResetAppRequested'

/**
 * Strips the reset-app flag from the URL so a later reload doesn't wipe the store again.
 */
export default function clearResetAppQueryParam(): void {
  const url = new URL(window.location.href)
  url.searchParams.delete(RESET_APP_QUERY_PARAM)
  window.history.replaceState(null, '', url)
}
