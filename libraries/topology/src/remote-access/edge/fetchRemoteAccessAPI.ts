import { HTTPMethod, MixedAppEnv, getCloudServiceURL, CloudService, Endpoint } from '../../cloudEdge'
import { getBearerToken } from '../../bearerToken'

type FetchRemoteAccessAPIOptions = {
  headers?: HeadersInit,
  body?: Record<string, unknown>,
  returnRawResponse?: boolean,
  // Attaches the logged-in cloud user's token, as supplied by the registered bearer token provider
  accessToken?: boolean,
}

const defaultOptions: FetchRemoteAccessAPIOptions = {
  headers: {},
  body: {},
  returnRawResponse: false,
}

// Talks to the Remote Access Server (api.cardinalapps.host).
export async function fetchRemoteAccessAPI<T>(
  endpoint: Endpoint,
  method: HTTPMethod = 'GET',
  env: MixedAppEnv,
  options?: FetchRemoteAccessAPIOptions,
): Promise<T> {
  options = { ...defaultOptions, ...options }

  if (options.accessToken) {
    const token = await getBearerToken()

    if (token) {
      options.headers = {
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      }
    }
  }

  if (method === 'POST' || method === 'DELETE' || method === 'PUT' || method === 'PATCH') {
    options.headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...options.headers,
    }
  }

  const url = getCloudServiceURL(env, CloudService.REMOTE_ACCESS)

  return new Promise((resolve, reject) => {
    fetch(`${url}${endpoint}`, {
      method: method,
      headers: options.headers,
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
            .then((thing) => {
              if (thing) {
                reject(thing)
              } else {
                reject(res.statusText)
              }
            })
            .catch(() => {
              textBackup.text()
                .then((msg) => {
                  if (msg) {
                    reject(msg)
                  } else {
                    reject(res.statusText)
                  }
                })
                .catch(() => reject(res.statusText))
            })
        }
      })
      .catch((err) => {
        reject(err)
      })
  })
}
