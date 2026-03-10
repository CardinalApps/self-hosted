import healthCheck from '../../../../store/slices/homeServer/thunks/healthCheck'
import { toastActions } from '../../../../store/slices/toast'

import { globalActions } from '../../../../store/constants/actions'

import { deleteAllJWTs } from '../../../../lib/auth/jwt'

import i18n from '../i18n'

/**
 * The Media Server returns a 410 on *any* route when our JWT is valid, but the
 * user ID in the JWT is not. Since our token is valid, the Media Server figures
 * that the account once existed but no longer does.
 *
 * This commonly happens when the user performs a factory reset, but a client
 * app like Cardinal Music isn't running and ready to receive the factory_reset
 * event in real time. All of the apps that are not running will be left with a
 * stale user ID in their token and must reset themselves.
 */
export default function handle410(res, endpoint, method, body, dispatch, lang) {
  if (res.status === 410) {
    deleteAllJWTs()

    dispatch({ type: globalActions.RESET })

    dispatch(toastActions.addToQueue({
      type: 'danger',
      title: i18n['login.error.410.title'][lang],
      body: i18n['login.error.410.body'][lang],
    }))

    // Perform a health check after resetting the app instead of waiting for the
    // next one
    dispatch(healthCheck())
  }
}
