import healthCheck from '../../../../store/slices/homeServer/thunks/healthCheck'
import { toastActions } from '../../../../store/slices/toast'
import refreshToken from '../../../../store/slices/homeServerUser/thunks/refreshToken'

import { globalActions } from '../../../../store/constants/actions'

import { deleteJwt, getJWT, JWT_TYPE } from '../../../../lib/auth/jwt'
import { cloudLogout, isCloudTokenRequired } from '../../../../lib/auth/cloudSession'

import i18n from '../i18n'

// Prevents concurrent 401 responses from triggering multiple simultaneous
// refresh attempts
let isRefreshing = false

/* Tear down whatever session state is left and send the user back to the login screen. Only the
   Media Server's own tolkien goes: the Cardinal account is shared with every other Cardinal app in
   this browser, and signing out of one server is not a reason to sign out of the account.
   The toast is announced only when there was a session to lose: a logged-out visitor's bootstrap
   refresh 401s too, and telling them they are "unauthorized" for never having logged in is noise,
   not information. */
export function fullLogout(dispatch, lang, serverErrorMessage) {
  const hadSession = Boolean(getJWT(JWT_TYPE.HOME_SERVER_USER))

  deleteJwt(JWT_TYPE.HOME_SERVER_USER)
  dispatch({ type: globalActions.RESET })

  if (hadSession) {
    dispatch(toastActions.addToQueue({
      type: 'danger',
      title: i18n['login.error.401.title'][lang],
      body: serverErrorMessage ? `<p>${serverErrorMessage}</p>` : i18n['login.error.401.body'][lang],
    }))
  }

  dispatch(healthCheck())
}

// Reads the refusal's code without spending the body, which the caller still has to read
async function refusalCode(res): Promise<unknown> {
  try {
    return (await res.clone().json())?.code
  } catch {
    return undefined
  }
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

  /* For a cloud-linked account the Cardinal account is the identity, so a cloud credential the
     server refused — missing or rejected — ends the session outright. The cloud tolkien goes on top
     of the usual teardown because the one in storage is the one that was just refused. Kept as its
     own branch because the refusal is diagnostically distinct, and because a cloud outage answers
     503, which never reaches here. */
  if (isCloudTokenRequired({ code: await refusalCode(res) })) {
    cloudLogout(dispatch)
    fullLogout(dispatch, lang, serverErrorMessage)
    return
  }

  if (endpoint.includes('/auth/refresh')) {
    fullLogout(dispatch, lang, serverErrorMessage)
    return
  }

  if (isRefreshing) return

  isRefreshing = true

  try {
    await dispatch(refreshToken()).unwrap()
    // Refresh succeeded — new access token is now in storage.
    // The in-flight request that got the 401 has already failed; the next
    // request from the UI will use the fresh token automatically.
  } catch (error) {
    // A refused cloud credential takes the Cardinal sign-in down too; a local-only failure leaves it
    if (isCloudTokenRequired(error)) {
      cloudLogout(dispatch)
    }

    fullLogout(dispatch, lang, serverErrorMessage)
  } finally {
    isRefreshing = false
  }
}
