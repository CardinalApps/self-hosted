import { registerBearerTokenProvider } from '@cardinalapps/topology/src/bearerToken'

import { runCloudTokenRefresh } from './authAPI'
import { getJWT, shouldRenewJwt, JWT_TYPE } from './jwt'

/*
 * Cloud access tokens last 15 minutes, so any page left open outlives one. Renewing the token on
 * the way out means a long session's cloud requests stop dying the moment that window closes.
 */
export const cloudBearerTokenProvider = async (): Promise<string | null> => {
  const token = getJWT(JWT_TYPE.CLOUD_USER)

  if (!token || !shouldRenewJwt(token, 60)) {
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
