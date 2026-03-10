import { authorizedFetchHeaders } from './jwt'

import { CLOUD_AUTH_HOST } from '../../../env'

const defaults = {
  body: {},
  headers: {},
}

/**
 * A hook for fetching to and from the auth API.
 *
 * @deprecated
 * @param {string} endpoint - API endpoint with a leading slash.
 * @param {string} method - HTTP method, all caps. Defaults to `GET`.
 * @param {boolean} sendJWT - Whether to include the locally stored JWT in the request headers. Defaults to `true`.
 * @param {object} options - Options object with keys `body` and `headers`.
 */
export default function useAuthAPI() {
  console.warn('useAuthAPI() is deprecated. Use authAPI() instead.')
  return (endpoint, method = 'GET', sendJWT = true, options = defaults) => new Promise((resolve, reject) => {
    if (sendJWT) {
      options.headers = { ...authorizedFetchHeaders() }
    }
    if (method === 'POST' || method === 'DELETE' || method === 'PUT' || method === 'PATCH') {
      options.headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options?.headers,
      }
    }

    fetch(`${CLOUD_AUTH_HOST}${endpoint}`, {
      method: method,
      headers: options.headers,
      body: options?.body && Object.keys(options.body).length ? JSON.stringify(options.body) : undefined,
    })
      .then((res) => {
        if (res.ok) {
          res.json()
            .then((thing) => resolve(thing))
            .catch((e) => resolve(e))
        } else {
          res.text()
            .then((msg) => reject(msg))
            .catch(() => reject(undefined))
        }
      })
      .catch((e) => {
        reject(e)
      })
  })
}
