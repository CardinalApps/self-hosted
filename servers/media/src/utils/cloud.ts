/**
 * FIXME this file is being replaced with the @cardinalapps/topology package
 */

import { fetchAuthAPI, HTTPMethod, MixedAppEnv, Endpoint } from '@cardinalapps/topology/dist/cjs'

import { getCurrentMode, Mode } from './env'

export enum WebsiteUrl {
  DEVELOPMENT = 'http://localhost:3066',
  PRODUCTION = 'https://cardinalapps.io',
}

export enum AuthServerUrl {
  DEVELOPMENT = 'http://localhost:4013',
  PRODUCTION = 'https://auth.cardinalcloud.io',
}

export type LatestRelease = {
  app: string,
  description: string,
  link: string,
  version: string,
  releasedAt: string,
}

type AuthFetchOptions = {
  headers?: Record<string, string>,
  body?: Record<string, string>,
  JWT?: string,
}

type WebsiteFetchOptions = {
  headers?: Record<string, string>,
  body?: BodyInit,
  returnRaw?: boolean,
}

const websiteFetchDefaults: WebsiteFetchOptions = {
  headers: {},
  returnRaw: false,
}

/**
 * Returns the website URL for this env.
 */
export function getWebsiteUrl() {
  const currentMode = getCurrentMode()

  if (currentMode === Mode.DEVELOPMENT) {
    return WebsiteUrl.DEVELOPMENT
  } else if (currentMode === Mode.PRODUCTION) {
    return WebsiteUrl.PRODUCTION
  }
}

/**
 * Returns the auth server URL for this env.
 */
export function getAuthServerUrl() {
  const currentMode = getCurrentMode()

  if (currentMode === Mode.DEVELOPMENT) {
    return AuthServerUrl.DEVELOPMENT
  } else if (currentMode === Mode.PRODUCTION) {
    return AuthServerUrl.PRODUCTION
  }
}

/**
 * Returns an object of headers that get attached to all outbound requests from
 * this Media Server.
 */
export function outboundHeaders() {
  return {
    'CardinalApp': 'Media Server',
    'CardinalHomeServer': '368423db-ecf4-46d3-aff1-ef66866b4696',
  }
}

/**
 * Fetches from the cloud auth servers. Endpoint must start with a slash.
 */
export function authAPI<T>(endpoint: Endpoint, method?: HTTPMethod, options?: AuthFetchOptions): Promise<T> {
  return new Promise((resolve, reject) => {
    let headers = { ...options?.headers }

    if (method === 'POST' || method === 'DELETE' || method === 'PUT' || method === 'PATCH') {
      headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...headers,
      }
    }

    if (options?.JWT) {
      headers = {
        ...headers,
        Authorization: `Bearer ${options.JWT}`,
      }
    }

    // Always add the server ID
    headers = {
      ...headers,
      ...outboundHeaders(),
    }

    fetchAuthAPI(
      endpoint,
      method ? method : 'GET',
      getCurrentMode() as MixedAppEnv,
      {
        headers,
        body: options.body,
      },
    )
      .then((res: T) => {
        resolve(res)
      })
      .catch((err) => {
        reject(err)
      })
  })
}

/**
 * A function for fetching from the website.
 * 
 * Since Cardinal Media Server is self-hosted by users, and therefore distributed
 * to many IPs, we send custom headers with all outbound requests so that our
 * traffic can be managed.
 *
 * @param {string} url - cardinalapps.io website API path to fetch. Must start with a slash.
 * @param {string} method - HTTP method, all caps. Defaults to `GET`.
 * @param {object} options.returnRaw - Return the original fetch response.
 * @param {object} options.body - Non-serialized body.
 * @param {object} options.headers - Non-serialized headers.
 */
export const websiteAPI = (path, method: HTTPMethod = 'GET', options?: WebsiteFetchOptions) => new Promise((resolve, reject) => {
  options = { ...websiteFetchDefaults, ...options }

  if (method === 'POST' || method === 'DELETE' || method === 'PUT' || method === 'PATCH') {
    options.headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...options?.headers,
    }
  }

  options.headers = {
    ...options?.headers,
    ...outboundHeaders(),
  }

  fetch(`${getWebsiteUrl()}/api${path}`, {
    method: method,
    headers: options.headers,
    body: options?.body || undefined,
  })
    .then((res) => {
      if (options.returnRaw) {
        return resolve(res)
      }

      if (res.ok) {
        res.json()
          .then((thing) => resolve(thing))
          .catch(() => resolve(null))
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
