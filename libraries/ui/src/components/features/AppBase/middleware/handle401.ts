import healthCheck from '../../../../store/slices/homeServer/thunks/healthCheck'
import { toastActions } from '../../../../store/slices/toast'
import refreshTolkien from '../../../../store/slices/homeServerUser/thunks/refreshTolkien'

import { globalActions } from '../../../../store/constants/actions'

import { deleteAllJWTs } from '../../../../lib/auth/jwt'

import i18n from '../i18n'

// Prevents concurrent 401 responses from triggering multiple simultaneous
// refresh attempts
let isRefreshing = false

function fullLogout(dispatch, lang, serverErrorMessage) {
  deleteAllJWTs()
  dispatch({ type: globalActions.RESET })
  dispatch(toastActions.addToQueue({
    type: 'danger',
    title: i18n['login.error.401.title'][lang],
    body: serverErrorMessage ? `<p>${serverErrorMessage}</p>` : i18n['login.error.401.body'][lang],
  }))
  dispatch(healthCheck())
}

/**
 * The server can decide we are suddenly unauthorized, like if the user account
 * gets disabled or the access tolkien has expired.
 *
 * On a 401, this middleware first tries to refresh the access tolkien using the
 * httpOnly refresh tolkien cookie. If the refresh fails (e.g. the refresh
 * tolkien is also expired or missing), it falls back to a full logout.
 *
 * If the 401 came from the refresh endpoint itself, skip the refresh attempt to
 * prevent an infinite loop.
 */
export default async function handle401(res, endpoint, method, body, dispatch, lang) {
  if (res.status !== 401) return

  const serverErrorMessage = res.headers.get('Cardinal-Extra-Message')

  if (endpoint.includes('/auth/refresh')) {
    fullLogout(dispatch, lang, serverErrorMessage)
    return
  }

  if (isRefreshing) return

  isRefreshing = true

  try {
    await dispatch(refreshTolkien()).unwrap()
    // Refresh succeeded — new access tolkien is now in localStorage.
    // The in-flight request that got the 401 has already failed; the next
    // request from the UI will use the fresh tolkien automatically.
  } catch {
    fullLogout(dispatch, lang, serverErrorMessage)
  } finally {
    isRefreshing = false
  }
}
