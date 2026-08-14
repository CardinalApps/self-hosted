import { useSelector } from 'react-redux'

import useRemoteAccessConnection from '../../../hooks/useRemoteAccessConnection'
import { settingsSelectors } from '../../../store/slices/settings'

import i18n from './i18n'

import './RemoteAccessStatusIndicator.css'

type RemoteAccessStatusIndicatorProps = {
  instanceId: string,
  matchmakerUrl?: string,
}

/**
 * A small badge showing how a Media Server is reachable through Remote
 * Access: direct, relayed, offline, or errored.
 */
function RemoteAccessStatusIndicator({ instanceId, matchmakerUrl }: RemoteAccessStatusIndicatorProps) {
  const { lang } = useSelector(settingsSelectors.current)
  const { status, plan, error } = useRemoteAccessConnection(instanceId, { matchmakerUrl })

  // An idle entry is one the hook is about to negotiate, so it reads as in-progress
  const display = status === 'idle' ? 'negotiating' : status

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
