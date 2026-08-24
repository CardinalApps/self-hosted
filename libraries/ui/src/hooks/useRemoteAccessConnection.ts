import { useCallback, useEffect, useRef } from 'react'
import { negotiateConnection } from '@cardinalapps/remote-access/src/negotiate'
import type { ConnectionPlan } from '@cardinalapps/remote-access/src/negotiate'
import { CloudService, getCloudServiceURL } from '@cardinalapps/topology/src/cloudEdge'

import { useAppDispatch } from './useAppDispatch'
import { useAppSelector } from './useAppSelector'
import { remoteAccessActions, remoteAccessSelectors } from '../store/slices/remoteAccess'
import type { RemoteAccessStatus } from '../store/slices/remoteAccess'
import { getMode } from '../lib/env/mode'

// One negotiation per instanceId at a time, shared across every consumer of the hook
const inFlight = new Map<string, AbortController>()

export type UseRemoteAccessConnection = {
  status: RemoteAccessStatus,
  plan?: ConnectionPlan,
  error?: string,
  refetch: () => void,
}

/**
 * Resolves how to reach a Media Server through Remote Access. Negotiates on
 * first use per instanceId and caches the plan in the store; `refetch()`
 * re-negotiates on demand.
 */
export default function useRemoteAccessConnection(
  instanceId: string,
  opts: { matchmakerUrl?: string } = {},
): UseRemoteAccessConnection {
  const dispatch = useAppDispatch()
  const entry = useAppSelector(remoteAccessSelectors.entry(instanceId))
  const ownController = useRef<AbortController | null>(null)

  const matchmakerUrl = opts.matchmakerUrl ?? getCloudServiceURL(getMode(), CloudService.REMOTE_ACCESS)

  const negotiate = useCallback(() => {
    if (!instanceId || inFlight.has(instanceId)) {
      return
    }

    const controller = new AbortController()
    inFlight.set(instanceId, controller)
    ownController.current = controller

    const fetchWithSignal = ((input, init) => fetch(input, { ...init, signal: controller.signal })) as typeof fetch

    dispatch(remoteAccessActions.connectionRequested({ instanceId }))

    negotiateConnection(matchmakerUrl, instanceId, fetchWithSignal)
      .then((plan) => {
        if (!controller.signal.aborted) {
          dispatch(remoteAccessActions.connectionResolved({ instanceId, plan }))
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          dispatch(remoteAccessActions.connectionFailed({ instanceId, error: error?.message || 'Negotiation failed' }))
        }
      })
      .finally(() => {
        if (inFlight.get(instanceId) === controller) {
          inFlight.delete(instanceId)
        }
        if (ownController.current === controller) {
          ownController.current = null
        }
      })
  }, [dispatch, instanceId, matchmakerUrl])

  useEffect(() => {
    if (instanceId && (!entry || entry.status === 'idle')) {
      negotiate()
    }
  }, [instanceId, entry, negotiate])

  /* Aborting only this hook's own fetch means an unmount never dispatches a failure. The entry is
     dropped rather than left 'negotiating' so any consumer still mounted starts a fresh attempt. */
  useEffect(() => {
    return () => {
      const controller = ownController.current
      if (controller && inFlight.get(instanceId) === controller) {
        controller.abort()
        inFlight.delete(instanceId)
        dispatch(remoteAccessActions.connectionInvalidated({ instanceId }))
      }
    }
  }, [dispatch, instanceId])

  return {
    status: entry?.status ?? 'idle',
    plan: entry?.plan,
    error: entry?.error,
    refetch: negotiate,
  }
}
