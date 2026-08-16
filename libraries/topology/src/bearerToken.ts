const CLOUD_USER_JWT_LOCALSTORAGE_KEY = '@cardinal/cloud_user_tolkien'

export type BearerTokenProvider = () => Promise<string | null>

/*
 * Reads whatever the browser last stored, with no notion of expiry. Apps that can refresh an
 * expired cloud token register a provider that does; everything else keeps this behavior.
 */
export const defaultBearerTokenProvider: BearerTokenProvider = async () => {
  if (typeof localStorage === 'undefined') {
    return null
  }

  return localStorage.getItem(CLOUD_USER_JWT_LOCALSTORAGE_KEY)
}

let bearerTokenProvider: BearerTokenProvider = defaultBearerTokenProvider

// Lets an app supply the cloud user's token, keeping this package free of any dependency on it
export const registerBearerTokenProvider = (provider: BearerTokenProvider) => {
  bearerTokenProvider = provider
}

export const resetBearerTokenProvider = () => {
  bearerTokenProvider = defaultBearerTokenProvider
}

// Returns the cloud user's bearer token, if there is one
export const getBearerToken = (): Promise<string | null> => bearerTokenProvider()
