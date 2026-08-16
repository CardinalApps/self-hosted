import { runCloudTokenRefresh } from './authAPI'
import { getJWT, JWT_TYPE } from './jwt'

/*
 * Resumes a Cardinal session from the refresh cookie alone. The access token is kept in storage and
 * is gone the moment the browser clears it, while the httpOnly cookie survives — so a tab that
 * comes back with no token in hand may still have a session the server would honour, and it costs
 * one refresh to find out.
 *
 * Silent both ways, and safe to call on any page load: a visitor who was never signed in reaches
 * this too, and has no session to be told anything about. Returns whether a usable token came out
 * of it.
 */
export const attemptCookieBootstrap = async (): Promise<boolean> => {
  if (getJWT(JWT_TYPE.CLOUD_USER)) {
    return true
  }

  const refresh = runCloudTokenRefresh()

  if (!refresh) {
    return false
  }

  try {
    await refresh
    return Boolean(getJWT(JWT_TYPE.CLOUD_USER))
  } catch {
    return false
  }
}
