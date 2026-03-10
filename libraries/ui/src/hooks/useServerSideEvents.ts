import { useEffect } from 'react'
import { useDispatch } from 'react-redux'

import { HOME_SERVER_HOST } from '../../env'
import { getJWT, JWT_TYPE } from '../lib/auth/jwt'

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

  useEffect(() => {
    const jwt = getJWT(JWT_TYPE.HOME_SERVER_USER)

    if (!jwt) {
      return
    }

    const eventSource = new EventSource(`${HOME_SERVER_HOST}/api/v${apiVersion}${endpoint}?authorization=${jwt}`)

    eventSource.onmessage = ({ data }) => {
      try {
        const event = JSON.parse(data)
        dispatch({ type: `sse/${event.type}`, payload: event?.payload || null })
      } catch {
        console.error('Received an event that was not a valid JSON string.', data)
      }
    }

    eventSource.onerror = () => {
      console.error('EventSource error')
    }

    return () => eventSource.close()
  }, [])
}
