import { JWT_TYPE, getJWT, authorizedFetchHeaders } from '../auth/jwt'

import { HOME_SERVER_HOST } from '../../../env'

export type Method = 'GET' | 'POST' | 'HEAD' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'PUT'
export type HomeServerAPIMiddleware = {
  [name: string]: (res: string, endpoint: string, method: Method, body: Record<string, unknown>) => void,
}

export const CARDINAL_APP_HEADER = 'cardinal-app'

/**
 * Holds all registered middleware functions.
 */
const registeredMiddleware: HomeServerAPIMiddleware = {}

/**
 * Registers a middleware with the homeServerAPI.
 */
export const registerHomeServerAPIMiddleware = (name, fn) => {
  if (name in registeredMiddleware) {
    console.warn(`Attempted to register the ${name} middleware more than once.`)
  } else {
    registeredMiddleware[name] = fn
  }
}

/**
 * Removes middleware that has already been registered.
 */
export const removeHomeServerAPIMiddleware = (name) => {
  if (name in registeredMiddleware) {
    delete registeredMiddleware[name]
  }
}

export type HomeServerAPIProps = {
  body?: Record<string, unknown>,
  headers?: Record<string, unknown>,
  returnRaw?: boolean,
  blob?: boolean,
  sendJWT?: boolean,
  JWT?: JWT_TYPE,
  version?: number,
  warnIfNoJWT?: boolean,
  sendCloudUserJWT?: boolean,
}

const defaults: HomeServerAPIProps = {
  body: {},
  headers: {},
  version: 1,
  sendJWT: true,
  JWT: JWT_TYPE.HOME_SERVER_USER,
  warnIfNoJWT: false,
  sendCloudUserJWT: true,
  blob: false,
  returnRaw: false,
}

export type HomeServerAPIResponse = unknown

const homeServerAPI = <T>(
  endpoint: string,
  method: Method = 'GET',
  options: HomeServerAPIProps = {},
) => new Promise<T>((resolve, reject) => {
  options = { ...defaults, ...options }

  // Local user JWT
  if (options.sendJWT) {
    options.headers = {
      ...options?.headers,
      ...authorizedFetchHeaders(options.JWT),
    }
  }

  // Cloud user JWT
  if (options.sendCloudUserJWT) {
    const cloudJWT = getJWT(JWT_TYPE.CLOUD_USER)
    if (cloudJWT) {
      options.headers = {
        ...options?.headers,
        CardinalTolkien: cloudJWT,
      }
    }
  }

  if (method === 'POST' || method === 'DELETE' || method === 'PUT' || method === 'PATCH') {
    options.headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...options?.headers,
    }
  }

  // Calls all registered middleware synchronously
  const triggerMiddleware = (res, endpoint, method, body) => {
    Object.values(registeredMiddleware).forEach((cb) => cb(res, endpoint, method, body))
  }

  const url = `${HOME_SERVER_HOST}/api/v${options.version}${endpoint}`
  const body = options?.body && Object.keys(options.body).length
    ? JSON.stringify(options.body)
    : undefined

  fetch(url, {
    method: method,
    headers: options.headers as HeadersInit,
    body: body,
    // TODO disable caching of the 410 Gone response server-side (it can be
    // returned on any endpoint)
    //cache: 'no-cache',
  })
    .then((res) => {
      triggerMiddleware(res, endpoint, method, body)

      if (options.returnRaw) {
        return resolve(res as T)
      }

      if (res.ok) {
        // Handle binary (blob) response type
        if (options.blob) {
          res.blob()
            .then((blobby) => {
              const urlCreator = window.URL || window.webkitURL
              const blobUrl = urlCreator.createObjectURL(blobby)
              resolve({ blobUrl, response: res } as T)
            })
            .catch((error) => {
              console.error(error)
              resolve(null)
            })
        }
        // Otherwise, expect JSON
        else {
          res.json()
            .then((thing) => resolve(thing))
            .catch(() => resolve({} as T)) // No action needed if the server did not return a valid JSON body
        }
      } else {
        res.json()
          .then((thing) => reject(thing))
          .catch((e) => reject(e))
      }
    })
    .catch((e) => {
      reject(e)
    })
})

export default homeServerAPI
