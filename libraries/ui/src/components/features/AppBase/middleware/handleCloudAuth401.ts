import { runCloudTokenRefresh } from '../../../../lib/auth/authAPI'
import { cloudLogout, isCredentialRejection } from '../../../../lib/auth/cloudSession'

/* The logout thunk's call, exactly: DELETE /user/session and nothing else. Its neighbours on the
   Sessions page — GET /user/sessions, and DELETE /user/session?sid= to revoke another device — are
   ordinary requests whose 401 deserves a refresh, not a sign-out. */
const isSelfLogout = (endpoint: string, method: string) => method === 'DELETE' && endpoint === '/user/session'

/*
 * On a 401 from the cloud auth server, renew the access token with the httpOnly refresh cookie so
 * the next request goes out authorized. The request that got the 401 stays failed either way; this
 * only decides what happens to the session behind it.
 *
 * A credential the server refuses is the end of that session, and there are three ways to hear it:
 * the refresh endpoint itself turning us down, a 401 on the way out the door, or a refresh rejected
 * mid-flight. Everything else — an unreachable server, an aborted request, a 503 — is temporary,
 * and leaves both the access token and the refresh cookie alone to be tried again.
 */
export default async function handleCloudAuth401(res: Response, endpoint: string, method, _body, dispatch) {
  if (res.status !== 401) return

  if (endpoint.includes('/auth/refresh') || isSelfLogout(endpoint, method)) {
    cloudLogout(dispatch)
    return
  }

  const refresh = runCloudTokenRefresh()

  // Nothing here can renew the token, but nothing here says the session is over either
  if (!refresh) return

  try {
    await refresh
  } catch (error) {
    if (isCredentialRejection(error)) {
      cloudLogout(dispatch)
    }
  }
}
