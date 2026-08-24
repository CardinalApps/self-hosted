import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react"
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query"
import { HOME_SERVER_HOST } from "../../../env"
import { prepareRTKQueryHeaders } from "../../lib/homeserver/prepareRTKQueryHeaders"
import { runTokenRefresh } from "../../lib/homeserver/homeServerAPI"
import { getJWT, isJwtExpiringSoon, JWT_TYPE } from "../../lib/auth/jwt"
import { settingsSelectors } from "../slices/settings"
import { fullLogout } from "../../components/features/AppBase/middleware/handle401"
import { resetForGoneUser } from "../../components/features/AppBase/middleware/handle410"
import { cloudLogout, isCloudTokenRequired } from "../../lib/auth/cloudSession"
import type { RootState } from "../index"

const rawBaseQuery = fetchBaseQuery({
  baseUrl: `${HOME_SERVER_HOST}/api/v1`,
  prepareHeaders: prepareRTKQueryHeaders,
})

/*
 * Mirrors homeServerAPI's token handling, which RTK Query requests bypass: refresh the access
 * token just before it expires, and when the server answers 401 anyway, refresh it and retry the
 * request once. Refreshes go through homeServerAPI's shared in-flight mutex, so a burst of queries
 * waking up with a stale token triggers a single refresh, shared with any concurrent homeServerAPI
 * call or SSE reconnect. If the refresh itself fails the session is unrecoverable — full logout.
 * A 410 (the token's user no longer exists, e.g. after a factory reset) resets the app the same
 * way the homeServerAPI middleware does.
 */
export const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (args, api, extraOptions) => {
  const token = getJWT(JWT_TYPE.HOME_SERVER_USER)

  if (token && isJwtExpiringSoon(token, 10)) {
    await runTokenRefresh()?.catch(() => null)
  }

  let result = await rawBaseQuery(args, api, extraOptions)

  if (result.error?.status === 401) {
    const refresh = runTokenRefresh()

    if (refresh) {
      const serverErrorMessage = result.meta?.response?.headers.get('Cardinal-Extra-Message')

      try {
        await refresh
        result = await rawBaseQuery(args, api, extraOptions)
      } catch (error) {
        /* A refresh the Media Server turned down for want of a cloud tolkien takes the Cardinal
           sign-in with it: for a cloud-linked account that credential is the identity, so the
           session is over. A local-only failure leaves the Cardinal account signed in. */
        if (isCloudTokenRequired(error)) {
          cloudLogout(api.dispatch)
        }

        const { lang } = settingsSelectors.current(api.getState() as RootState) as { lang?: string }
        fullLogout(api.dispatch, lang, serverErrorMessage)
      }
    }
  }

  if (result.error?.status === 410) {
    const { lang } = settingsSelectors.current(api.getState() as RootState) as { lang?: string }
    resetForGoneUser(api.dispatch, lang)
  }

  return result
}

export const baseHomeServerApi = createApi({
  reducerPath: 'api',
  refetchOnMountOrArgChange: true,
  baseQuery: baseQueryWithReauth,
  endpoints: () => ({}),
})
