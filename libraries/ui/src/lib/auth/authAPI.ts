import { JWT_TYPE, getJWT, authorizedFetchHeaders, isJwtExpiringSoon } from './jwt'

import { CLOUD_AUTH_HOST } from '../../../env'

export type Method = 'GET' | 'POST' | 'HEAD' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'PUT'

export type AuthAPIMiddleware = {
  [name: string]: (res: Response, endpoint: string, method: Method, body: string | undefined) => void | Promise<void>,
}

const registeredMiddleware: AuthAPIMiddleware = {}

export const registerAuthAPIMiddleware = (name: string, fn: AuthAPIMiddleware[string]) => {
  if (name in registeredMiddleware) {
    console.warn(`Attempted to register the ${name} authAPI middleware more than once.`)
  } else {
    registeredMiddleware[name] = fn
  }
}

export const removeAuthAPIMiddleware = (name: string) => {
  if (name in registeredMiddleware) {
    delete registeredMiddleware[name]
  }
}

let tokenRefreshProvider: (() => Promise<string>) | null = null

export const registerCloudTokenRefreshProvider = (fn: () => Promise<string>) => {
  tokenRefreshProvider = fn
}

export type AuthAPIProps = {
  body?: Record<string, unknown>,
  headers?: Record<string, unknown>,
  sendJWT?: boolean,
  JWT?: JWT_TYPE,
  warnIfNoJWT?: boolean,
  returnRawResponse?: boolean,
  skipMiddleware?: boolean,
}

const defaults: AuthAPIProps = {
  body: {},
  headers: {},
  JWT: JWT_TYPE.CLOUD_USER,
  sendJWT: true,
  warnIfNoJWT: false,
  returnRawResponse: false,
  skipMiddleware: false,
}

const authAPI = async <T>(
  endpoint: string,
  method: Method = 'GET',
  options: AuthAPIProps = {},
): Promise<T> => {
  options = { ...defaults, ...options }

  // Proactively refresh the access token if it expires within 60 seconds
  if (options.sendJWT && tokenRefreshProvider) {
    const token = getJWT(JWT_TYPE.CLOUD_USER)
    if (token && isJwtExpiringSoon(token, 60)) {
      try {
        await tokenRefreshProvider()
      } catch {
        // If proactive refresh fails, let the request proceed; the reactive
        // 401 handler will deal with it
      }
    }
  }

  if (options.sendJWT) {
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

  const triggerMiddleware = async (res: Response, endpoint: string, method: Method, body: string | undefined) => {
    for (const cb of Object.values(registeredMiddleware)) {
      await cb(res, endpoint, method, body)
    }
  }

  const body = options?.body && Object.keys(options.body).length
    ? JSON.stringify(options.body)
    : undefined

  const res = await fetch(`${CLOUD_AUTH_HOST}${endpoint}`, {
    method,
    headers: options.headers as HeadersInit,
    credentials: 'include',
    body,
  })

  if (!options.skipMiddleware) {
    await triggerMiddleware(res, endpoint, method, body)
  }

  if (options.returnRawResponse) {
    return res as T
  }

  if (res.ok) {
    try {
      return await res.json()
    } catch {
      return {} as T
    }
  } else {
    throw await res.json().catch((e) => e)
  }
}

export default authAPI
