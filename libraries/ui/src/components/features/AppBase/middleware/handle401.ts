import healthCheck from '../../../../store/slices/homeServer/thunks/healthCheck'
import { toastActions } from '../../../../store/slices/toast'

import { globalActions } from '../../../../store/constants/actions'

import { deleteAllJWTs } from '../../../../lib/auth/jwt'

import i18n from '../i18n'

/**
 * The server can decide we are suddenly unauthorized, like if the user account
 * gets disabled.
 */
export default function handle401(res, endpoint, method, body, dispatch, lang) {
  if (res.status === 401) {
    const serverErrorMessage = res.headers.get('Cardinal-Extra-Message')

    deleteAllJWTs()

    dispatch({ type: globalActions.RESET })

    dispatch(toastActions.addToQueue({
      type: 'danger',
      title: i18n['login.error.401.title'][lang],
      body: serverErrorMessage ? `<p>${serverErrorMessage}</p>` : i18n['login.error.401.body'][lang],
    }))

    // Perform a health check after resetting the app instead of waiting for the
    // next one
    dispatch(healthCheck())
  }
}
