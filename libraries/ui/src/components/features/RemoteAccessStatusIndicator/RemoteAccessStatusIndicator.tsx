import { useSelector } from 'react-redux'

import useRemoteAccessConnection from '../../../hooks/useRemoteAccessConnection'
import { settingsSelectors } from '../../../store/slices/settings'
import type { RemoteAccessStatus } from '../../../store/slices/remoteAccess'
import type { ConnectionState } from '../../../store/apis/remoteAccess'

import i18n from './i18n'

import './RemoteAccessStatusIndicator.css'

// The states Cardinal holds a server out of Remote Access with, whatever a negotiation says
const GATE_STATES = ['not_approved', 'suspended'] as const

type GateState = typeof GATE_STATES[number]

export type IndicatorState = Exclude<RemoteAccessStatus, 'idle'> | GateState

const isGateState = (state?: ConnectionState): state is GateState =>
  !!state && (GATE_STATES as readonly string[]).includes(state)

/* A gate outranks the negotiated status: a server the cloud is holding out is unreachable even
   while a stale plan still names a URL. An idle entry is one the hook is about to negotiate, so
   it reads as in-progress. */
export function indicatorState(status: RemoteAccessStatus, state?: ConnectionState): IndicatorState {
  if (isGateState(state)) {
    return state
  }

  return status === 'idle' ? 'negotiating' : status
}

type RemoteAccessStatusIndicatorProps = {
  instanceId: string,
  matchmakerUrl?: string,
  state?: ConnectionState,
}

/**
 * A small badge showing how a Media Server is reachable through Remote
 * Access: direct, relayed, offline, errored, or held out by Cardinal. Pass
 * `state` when the server's own connection state is known.
 */
function RemoteAccessStatusIndicator({ instanceId, matchmakerUrl, state }: RemoteAccessStatusIndicatorProps) {
  const { lang } = useSelector(settingsSelectors.current)
  const { status, plan, error } = useRemoteAccessConnection(instanceId, { matchmakerUrl })

  const display = indicatorState(status, state)

  const title = error
    || (plan && plan.kind !== 'offline' ? plan.url : undefined)

  return (
    <span className="remote-access-status-indicator" data-status={display} title={title}>
      <span className="indicator-dot" />
      {i18n[`ra-status.${display}`][lang]}
    </span>
  )
}

export default RemoteAccessStatusIndicator
