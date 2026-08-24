import { deleteJwt, JWT_TYPE } from './jwt'

/*
 * A browser signed into a Media Server holds two credentials: the local session, and the Cardinal
 * account the local account is linked to. The Media Server answers with this code when only the
 * cloud one is at fault, so the client can drop that half and leave the local session standing.
 */
export const CLOUD_TOKEN_REQUIRED_CODE = 'cloud_token_required'

// Reads the Media Server's code out of an error body, wherever the caller happened to catch it
export function isCloudTokenRequired(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }

  const body = error as { code?: unknown, data?: { code?: unknown } }

  return body.code === CLOUD_TOKEN_REQUIRED_CODE || body.data?.code === CLOUD_TOKEN_REQUIRED_CODE
}

/*
 * Whether a failed cloud request was the server refusing the credential, rather than the server
 * having a bad day. The auth server answers 503 and keeps the refresh cookie when it cannot reach
 * its dependencies, so 401 is the only answer that ends a session. The status is read from `code`
 * as well because RTK serializes thunk rejections down to name/message/stack/code.
 */
export function isCredentialRejection(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }

  const { status, code } = error as { status?: unknown, code?: unknown }

  return status === 401 || code === 401
}

// Signs out of the Cardinal account without disturbing the local session
export function cloudLogout(dispatch: (action: { type: string }) => unknown): void {
  deleteJwt(JWT_TYPE.CLOUD_USER)
  dispatch({ type: 'cloudUser/logout/fulfilled' })
}
