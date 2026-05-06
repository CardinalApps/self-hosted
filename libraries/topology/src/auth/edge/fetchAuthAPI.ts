import { HTTPMethod, MixedAppEnv, getCloudServiceURL, CloudService, Endpoint } from '../../cloudEdge'

type FetchAuthAPIOptions = {
  headers?: HeadersInit,
  body?: Record<string, unknown>,
  returnRawResponse?: boolean,
}

const defaultsOptions = {
  headers: {},
  body: {},
  returnRawResponse: false,
}

export function fetchAuthAPI<T>(
  endpoint: Endpoint,
  method: HTTPMethod = 'GET',
  env: MixedAppEnv,
  options?: FetchAuthAPIOptions,
): Promise<T> {
  return new Promise((resolve, reject) => {
    options = { ...defaultsOptions, ...options }

    if (method === 'POST' || method === 'DELETE' || method === 'PUT' || method === 'PATCH') {
      options.headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      }
    }

    const url = getCloudServiceURL(env, CloudService.AUTH)

    fetch(`${url}${endpoint}`, {
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
