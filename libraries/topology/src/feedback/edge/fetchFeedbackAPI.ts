import { HTTPMethod, MixedAppEnv, getCloudServiceURL, CloudService, Endpoint } from '../../cloudEdge'

const CLOUD_USER_JWT_LOCALSTORAGE_KEY = '@cardinal/cloud_user_tolkien'

type FetchFeedbackAPIOptions = {
  headers?: HeadersInit,
  body?: Record<string, unknown>,
  accessToken?: boolean,
}

const defaultOptions: FetchFeedbackAPIOptions = {
  headers: {},
  body: {},
}

export function fetchFeedbackAPI<T>(
  endpoint: Endpoint,
  method: HTTPMethod = 'GET',
  env: MixedAppEnv,
  options?: FetchFeedbackAPIOptions,
): Promise<T> {
  return new Promise((resolve, reject) => {
    options = { ...defaultOptions, ...options }

    if (options.accessToken) {
      const token = localStorage.getItem(CLOUD_USER_JWT_LOCALSTORAGE_KEY)

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
          const rateLimitReset = res.headers.get('RateLimit-Reset')
          const retryAfterSeconds = rateLimitReset ? parseInt(rateLimitReset, 10) : undefined

          const textBackup = res.clone()
          res.json()
            .then((data) => {
              if (data) {
                reject({ message: data, retryAfterSeconds })
              } else {
                reject({ message: res.statusText, retryAfterSeconds })
              }
            })
            .catch(() => {
              textBackup.text()
                .then((msg) => {
                  if (msg) {
                    reject({ message: msg, retryAfterSeconds })
                  } else {
                    reject({ message: res.statusText, retryAfterSeconds })
                  }
                })
                .catch(() => reject({ message: res.statusText, retryAfterSeconds }))
            })
        }
      })
      .catch((err) => {
        reject(err)
      })
  })
}
