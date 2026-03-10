import { JWT_TYPE, authorizedFetchHeaders } from '@cardinalapps/ui/src/lib/auth/jwt'

/**
 * Sets the headers needed in RTK Query for Media Server auth.
 */
export const prepareRTKQueryHeaders = (headers) => {
  const authHeaders = authorizedFetchHeaders(JWT_TYPE.HOME_SERVER_USER)
  Object.keys(authHeaders).forEach((key) => {
    headers.set(key, authHeaders[key])
  })
  return headers
}
