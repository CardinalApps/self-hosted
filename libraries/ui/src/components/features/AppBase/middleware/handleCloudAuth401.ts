import refreshToken from '../../../../store/slices/cloudUser/thunks/refreshToken'
import { deleteJwt, JWT_TYPE } from '../../../../lib/auth/jwt'

// Prevents concurrent 401 responses from triggering multiple simultaneous
// refresh attempts
let isRefreshing = false

function cloudLogout(dispatch) {
  deleteJwt(JWT_TYPE.CLOUD_USER)
  dispatch({ type: 'cloudUser/logout/fulfilled' })
}

/**
 * On a 401 from the cloud auth server, attempt to refresh the cloud access
 * token using the httpOnly refresh cookie. If the refresh fails, clear the
 * cloud JWT and dispatch a logout so the UI resets to the sign-in state.
 *
 * Skips refresh if the 401 came from /auth/refresh itself to prevent an
 * infinite loop.
 */
export default async function handleCloudAuth401(res: Response, endpoint: string, _method, _body, dispatch) {
  if (res.status !== 401) return

  // Skip refresh for endpoints that should trigger logout directly:
  // - /auth/refresh itself (would cause infinite loop)
  // - /user/session DELETE (logout — a 401 here means the session is already
  //   gone, so retrying with a fresh token serves no purpose)
  if (endpoint.includes('/auth/refresh') || endpoint.includes('/user/session')) {
    cloudLogout(dispatch)
    return
  }

  if (isRefreshing) return

  isRefreshing = true

  try {
    await dispatch(refreshToken()).unwrap()
  } catch {
    cloudLogout(dispatch)
  } finally {
    isRefreshing = false
  }
}
