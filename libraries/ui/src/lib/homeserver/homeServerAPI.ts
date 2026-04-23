import { JWT_TYPE, getJWT, authorizedFetchHeaders, isJwtExpiringSoon } from '../auth/jwt'

import { HOME_SERVER_HOST } from '../../../env'

export type Method = 'GET' | 'POST' | 'HEAD' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'PUT'

export const CARDINAL_APP_HEADER = 'cardinal-app'
export type HomeServerAPIMiddleware = {
  [name: string]: (res: string, endpoint: string, method: Method, body: Record<string, unknown>) => void | Promise<void>,
}

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

/**
 * A callback that returns a fresh access tolkien. Registered by AppBase after
 * the Redux store is ready so homeServerAPI can proactively refresh before a
 * request when the stored token is about to expire.
 */
let tokenRefreshProvider: (() => Promise<string>) | null = null

export const registerTokenRefreshProvider = (fn: () => Promise<string>) => {
  tokenRefreshProvider = fn
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

const homeServerAPI = async <T>(
  endpoint: string,
  method: Method = 'GET',
  options: HomeServerAPIProps = {},
): Promise<T> => {
  options = { ...defaults, ...options }

  // Proactively refresh the access tolkien if it expires within 10 seconds
  if (options.sendJWT && options.JWT === JWT_TYPE.HOME_SERVER_USER && tokenRefreshProvider) {
    const token = getJWT(JWT_TYPE.HOME_SERVER_USER)
    if (token && isJwtExpiringSoon(token, 10)) {
      try {
        await tokenRefreshProvider()
      } catch {
        // If proactive refresh fails, let the request proceed and rely on the
        // reactive 401 handler to deal with it
      }
    }
  }

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

  // Calls all registered middleware sequentially and awaits each one so that
  // async handlers (e.g. the 401 refresh handler) complete before the caller's
  // catch block fires
  const triggerMiddleware = async (res, endpoint, method, body) => {
    for (const cb of Object.values(registeredMiddleware)) {
      await cb(res, endpoint, method, body)
    }
  }

  const url = `${HOME_SERVER_HOST}/api/v${options.version}${endpoint}`
  const body = options?.body && Object.keys(options.body).length
    ? JSON.stringify(options.body)
    : undefined

  const res = await fetch(url, {
    method: method,
    headers: options.headers as HeadersInit,
    body: body,
    credentials: 'include',
    // TODO disable caching of the 410 Gone response server-side (it can be
    // returned on any endpoint)
    //cache: 'no-cache',
  })

  await triggerMiddleware(res, endpoint, method, body)

  if (options.returnRaw) {
    return res as T
  }

  if (res.ok) {
    // Handle binary (blob) response type
    if (options.blob) {
      try {
        const blobby = await res.blob()
        const urlCreator = window.URL || window.webkitURL
        const blobUrl = urlCreator.createObjectURL(blobby)
        return { blobUrl, response: res } as T
      } catch (error) {
        console.error(error)
        return null
      }
    }
    // Otherwise, expect JSON
    try {
      return await res.json()
    } catch {
      return {} as T // No action needed if the server did not return a valid JSON body
    }
  } else {
    throw await res.json().catch((e) => e)
  }
}

export default homeServerAPI
