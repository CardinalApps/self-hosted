import { registerBearerTokenProvider } from '@cardinalapps/topology/src/bearerToken'

import { runCloudTokenRefresh } from './authAPI'
import { getJWT, isJwtExpiringSoon, JWT_TYPE } from './jwt'

// An unreadable token can't be judged, so leave it alone and let the server refuse it
const expiringSoon = (token: string) => {
  try {
    return isJwtExpiringSoon(token, 60)
  } catch {
    return false
  }
}

/*
 * Cloud access tokens last 15 minutes, so any page left open outlives one. Renewing the token on
 * the way out means a long session's cloud requests stop dying the moment that window closes.
 */
export const cloudBearerTokenProvider = async (): Promise<string | null> => {
  const token = getJWT(JWT_TYPE.CLOUD_USER)

  if (!token || !expiringSoon(token)) {
    return token ?? null
  }

  try {
    await runCloudTokenRefresh()
  } catch {
    // Send the stale token anyway; the reactive 401 handler deals with what comes back
  }

  return getJWT(JWT_TYPE.CLOUD_USER) ?? null
}

// Gives topology's edge fetchers a cloud token that renews itself, without topology knowing how
export const registerCloudBearerTokenProvider = () => {
  registerBearerTokenProvider(cloudBearerTokenProvider)
}
