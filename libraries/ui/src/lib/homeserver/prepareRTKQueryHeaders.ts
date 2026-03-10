import { JWT_TYPE, authorizedFetchHeaders } from '../auth/jwt'

/**
 * Sets the headers needed in RTK Query for Media Server auth.
 */
export const prepareRTKQueryHeaders = (headers, { getState }) => {
  const authHeaders = authorizedFetchHeaders(JWT_TYPE.HOME_SERVER_USER)
  const store = getState()

  Object.keys(authHeaders).forEach((key) => {
    headers.set(key, authHeaders[key])
  })

  headers.set('Cardinal-App', store?.app?.app)

  return headers
}
