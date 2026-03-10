/**
 * TODO use topology package
 */

import { JWT_TYPE, authorizedFetchHeaders } from './jwt'

import { CLOUD_AUTH_HOST } from '../../../env'

const defaults = {
  body: {},
  headers: {},
  JWT: JWT_TYPE.CLOUD_USER,
  warnIfNoJWT: false,
  returnRawResponse: false,
}

/**
 * A hook for fetching from the cloud auth API.
 *
 * @param {string} endpoint - API endpoint with a leading slash.
 * @param {string} method - HTTP method, all caps. Defaults to `GET`.
 * @param {object} options.body - Non-serialized body.
 * @param {object} options.headers - Non-serialized headers.
 * @param {object} options.JWT - Override the JWT that gets sent for this request. Defaults to using the Cloud User JWT in local storage.
 * @param {object} options.warnIfNoJWT - console.warn() if no JWT was found in localstorage.
 * @param {object} options.returnRawResponse
 */
export default function authAPI<T>(endpoint, method = 'GET', options?): Promise<T> {
  return new Promise((resolve, reject) => {
    options = { ...defaults, ...options }

    if (options.JWT) {
      options.headers = {
        ...options.headers,
        ...authorizedFetchHeaders(options.JWT),
      }
    }

    if (method === 'POST' || method === 'DELETE' || method === 'PUT' || method === 'PATCH') {
      options.headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      }
    }

    fetch(`${CLOUD_AUTH_HOST}${endpoint}`, {
      method: method,
      headers: options.headers,
      credentials: 'include',
      body: options?.body && Object.keys(options.body).length ? JSON.stringify(options.body) : undefined,
    })
      .then((res) => {
        if (options.returnRawResponse) {
          return resolve(res as T)
        }
        if (res.ok) {
          res.json()
            .then((thing) => resolve(thing))
            .catch((e) => resolve(e))
        } else {
          const textBackup = res.clone()
          res.json()
            .then((thing) => reject(thing))
            .catch(() => {
              textBackup.text()
                .then((msg) => reject(msg))
                .catch(() => reject(res.statusText))
            })
        }
      })
      .catch((err) => {
        reject(err)
      })
  })
}
