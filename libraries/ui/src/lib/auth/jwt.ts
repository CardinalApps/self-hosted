/**
 * @file - The aliases are here until all the callers switch to the all caps
 * versions, then the lowercase versions will be removed.
 */

export const CLOUD_USER_JWT_LOCALSTORAGE_KEY = '@cardinal/cloud_user_tolkien'
export const HOME_SERVER_USER_JWT_LOCALSTORAGE_KEY = '@cardinal/home_server_user_tolkien'

// In-memory store for scope === 'memory'. Intentionally cleared on page reload.
let memoryToken: string | null = null

export enum JWT_TYPE {
  CLOUD_USER = 'cloud_user',
  HOME_SERVER_USER = 'home_server_user',
}

/**
 * Sets the JWT in local storage.
 *
 * @param {string} token
 * @returns {void}
 */
export type JwtScope = 'local' | 'session' | 'memory'

export function setJwt(token, type = JWT_TYPE.CLOUD_USER, scope: JwtScope = 'local') {
  switch (type) {
    case JWT_TYPE.CLOUD_USER: {
      const storage = scope === 'session' ? sessionStorage : localStorage
      storage.setItem(CLOUD_USER_JWT_LOCALSTORAGE_KEY, token)
      break
    }

    case JWT_TYPE.HOME_SERVER_USER:
      // Clear all storage locations so only one holds the token at a time
      localStorage.removeItem(HOME_SERVER_USER_JWT_LOCALSTORAGE_KEY)
      sessionStorage.removeItem(HOME_SERVER_USER_JWT_LOCALSTORAGE_KEY)
      memoryToken = null

      if (scope === 'memory') {
        memoryToken = token
      } else {
        const storage = scope === 'session' ? sessionStorage : localStorage
        storage.setItem(HOME_SERVER_USER_JWT_LOCALSTORAGE_KEY, token)
      }
      break

    default:
      console.error('Invalid token type, use a JWT_TYPE.')
  }
}

// Alias
export const setJWT = setJwt

/**
 * Returns the locally stored JWT.
 *
 * @returns {string}
 */
export function getJwt(type = JWT_TYPE.CLOUD_USER) {
  switch (type) {
    case JWT_TYPE.CLOUD_USER:
      return localStorage.getItem(CLOUD_USER_JWT_LOCALSTORAGE_KEY)

    case JWT_TYPE.HOME_SERVER_USER:
      return memoryToken
        ?? sessionStorage.getItem(HOME_SERVER_USER_JWT_LOCALSTORAGE_KEY)
        ?? localStorage.getItem(HOME_SERVER_USER_JWT_LOCALSTORAGE_KEY)

    default:
      console.error('Invalid token type, use a JWT_TYPE.')
  }
}

// Alias
export const getJWT = getJwt

/**
 * Deletes the locally stored JWT.
 *
 * @returns {string}
 */
export function deleteJwt(type = JWT_TYPE.CLOUD_USER) {
  switch (type) {
    case JWT_TYPE.CLOUD_USER:
      return localStorage.removeItem(CLOUD_USER_JWT_LOCALSTORAGE_KEY)

    case JWT_TYPE.HOME_SERVER_USER:
      localStorage.removeItem(HOME_SERVER_USER_JWT_LOCALSTORAGE_KEY)
      sessionStorage.removeItem(HOME_SERVER_USER_JWT_LOCALSTORAGE_KEY)
      memoryToken = null
      break

    default:
      console.error('Invalid token type, use a JWT_TYPE.')
  }
}

// Alias
export const deleteJWT = deleteJwt

/**
 * Deletes all locally stored JWTs.
 *
 * @param {string} token
 * @returns {object}
 */
export function deleteAllJwts() {
  deleteJWT(JWT_TYPE.CLOUD_USER)
  deleteJWT(JWT_TYPE.HOME_SERVER_USER)
}

// Alias
export const deleteAllJWTs = deleteAllJwts

/**
 * Reads the contents of the given JWT.
 *
 * @param {string} token
 * @returns {object}
 */
export function readJwt(token) {
  const base64Url = token.split('.')[1]
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
  const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
  }).join(''))

  return JSON.parse(jsonPayload)
}

// Alias
export const readJWT = readJwt

/**
 * Checks if the given JWT is expired.
 *
 * @param {string} token
 */
export function isJwtExpired(token) {
  const { exp } = readJwt(token)
  return new Date(exp * 1000) < new Date()
}

// Alias
export const isJWTExpired = isJwtExpired

/**
 * Checks if the given JWT expires within `secondsBuffer` seconds from now.
 */
export function isJwtExpiringSoon(token: string, secondsBuffer = 60): boolean {
  const { exp } = readJwt(token)
  return new Date((exp - secondsBuffer) * 1000) < new Date()
}

// Alias
export const isJWTExpiringSoon = isJwtExpiringSoon

/**
 * Returns the header(s) needed for a fetch to the auth servers using these
 * JWTs.
 *
 * The chosen JWT will be used in the Authorization header. If the chosen JWT is
 * the home server JWT, then this will automatically look for the cloud user JWT
 * and attach it as the CardinalTolkien for convenience.
 *
 * @param {string} JWT - Use one of the JWT_TYPES to use a JWT from local
 * storage, or set this to a specific JWT to use.
 * @returns {object}
 */
export function authorizedFetchHeaders(JWT = JWT_TYPE.CLOUD_USER) {
  let headers = {}

  if (JWT) {
    if (JWT === JWT_TYPE.CLOUD_USER) {
      const jwt = getJwt(JWT_TYPE.CLOUD_USER)
      if (jwt) {
        headers = {
          Authorization: `Bearer ${jwt}`,
        }
      }
    } else if (JWT === JWT_TYPE.HOME_SERVER_USER) {
      const homeJwt = getJwt(JWT_TYPE.HOME_SERVER_USER)
      const cloudJwt = getJwt(JWT_TYPE.CLOUD_USER)
      headers = {
        ...(homeJwt ? { Authorization: `Bearer ${getJwt(JWT_TYPE.HOME_SERVER_USER)}` } : {}),
        ...(cloudJwt ? { CardinalTolkien: getJwt(JWT_TYPE.CLOUD_USER) } : {}),
      }
    } else {
      headers = {
        Authorization: `Bearer ${JWT}`,
      }
    }
  }

  return headers
}
