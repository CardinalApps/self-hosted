import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { EventSource, type FetchLike } from 'eventsource'

import { HOME_SERVER_HOST } from '../../env'
import { authorizedFetchHeaders, getJWT, isJwtExpiringSoon, JWT_TYPE } from '../lib/auth/jwt'
import { runTokenRefresh } from '../lib/homeserver/homeServerAPI'
import { homeServerUserSelectors } from '../store/slices/homeServerUser'

const RECONNECT_BASE_DELAY_MS = 1000
const RECONNECT_MAX_DELAY_MS = 30000

/**
 * Establishes a connection to an API endpoint that implements server-side
 * events. Whenever a server-side event is received, a custom Redux action will
 * be dispatched, allowing the UI to instantly react to changes in the server.
 *
 * The custom action that gets dispatched will be in the format of
 * `sse/<sse_event_type>`. The server uses dot notation for its event names, so
 * they are easy to distinguish from typical Redux action types that use forward
 * slashes.
 *
 * Reducers can then subscribe to the custom actions that they need using the
 * slice's extraReducers builder.
 *
 * If the server gave a payload, it will be attached to the dispatched action
 * the same way normal Redux actions provide it.
 *
 * The React component that uses this hook will need to remain mounted for the
 * events to keep flowing.
 */
export default function useServerSideEvents(endpoint = '/events/subscribe', apiVersion = 1) {
  const dispatch = useDispatch()
  const loggedIn = useSelector(homeServerUserSelectors.loggedIn)

  useEffect(() => {
    if (!loggedIn) {
      return
    }

    let eventSource: EventSource | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let failedAttempts = 0
    let disposed = false

    /* Auth headers are built at request time, so every connection attempt — including
       the automatic retries after a network error — carries the current tokens */
    const fetchWithAuthHeaders: FetchLike = (url, init) => fetch(url, {
      ...init,
      headers: {
        ...init.headers,
        ...authorizedFetchHeaders(JWT_TYPE.HOME_SERVER_USER),
      },
    })

    // Schedules a reconnection with exponential backoff
    const scheduleReconnect = () => {
      if (disposed || reconnectTimer) {
        return
      }

      const delay = Math.min(RECONNECT_BASE_DELAY_MS * 2 ** failedAttempts, RECONNECT_MAX_DELAY_MS)
      failedAttempts += 1

      reconnectTimer = setTimeout(() => {
        reconnectTimer = null
        connect()
      }, delay)
    }

    // Opens the SSE connection, refreshing a stale access token first
    const connect = async () => {
      const token = getJWT(JWT_TYPE.HOME_SERVER_USER)

      if (!token) {
        return
      }

      try {
        if (isJwtExpiringSoon(token, 10)) {
          await runTokenRefresh()
        }
      } catch {
        // Connect anyway and let the 401 handling below deal with it
      }

      if (disposed) {
        return
      }

      const source = new EventSource(`${HOME_SERVER_HOST}/api/v${apiVersion}${endpoint}`, {
        fetch: fetchWithAuthHeaders,
      })
      eventSource = source

      source.onopen = () => {
        failedAttempts = 0
      }

      source.onmessage = ({ data }) => {
        try {
          const event = JSON.parse(data)
          dispatch({ type: `sse/${event.type}`, payload: event?.payload || null })
        } catch {
          console.error('Received an event that was not a valid JSON string.', data)
        }
      }

      source.onerror = (error) => {
        /* Network errors are retried by the EventSource itself, and each retry rebuilds
           the auth headers. HTTP errors close the connection permanently (per the SSE
           spec), so those reconnects are handled here — after a token refresh when the
           server said 401. */
        if (source.readyState !== EventSource.CLOSED) {
          return
        }

        const refresh = error.code === 401 ? runTokenRefresh() : null

        Promise.resolve(refresh).catch(() => null).finally(() => scheduleReconnect())
      }
    }

    connect()

    return () => {
      disposed = true

      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
      }

      eventSource?.close()
    }
  }, [loggedIn])
}
