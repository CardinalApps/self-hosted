import { HTTPMethod, MixedAppEnv, getCloudServiceURL, CloudService, Endpoint } from '../cloudEdge'

type FetchFeedbackAPIOptions = {
  headers?: HeadersInit,
  body?: Record<string, unknown>,
}

const defaultOptions: FetchFeedbackAPIOptions = {
  headers: {},
  body: {},
}

/**
 * A function for fetching from the feedback API.
 */
export function fetchFeedbackAPI<T>(
  endpoint: Endpoint,
  method: HTTPMethod = 'GET',
  env: MixedAppEnv,
  options?: FetchFeedbackAPIOptions,
): Promise<T> {
  return new Promise((resolve, reject) => {
    options = { ...defaultOptions, ...options }

    if (method === 'POST' || method === 'DELETE' || method === 'PUT' || method === 'PATCH') {
      options.headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      }
    }

    const url = getCloudServiceURL(env, CloudService.FEEDBACK)

    fetch(`${url}${endpoint}`, {
      method: method,
      headers: options.headers,
      body: options?.body && Object.keys(options.body).length ? JSON.stringify(options.body) : undefined,
    })
      .then((res) => {
        if (res.ok) {
          res.json()
            .then((data) => resolve(data))
            .catch((e) => resolve(e))
        } else {
          const textBackup = res.clone()
          res.json()
            .then((data) => {
              if (data) {
                reject(data)
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
