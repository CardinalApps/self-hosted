import { MatchmakerUnavailableError, ServerNotFoundError } from './errors'
import { ConnectionCandidate, ConnectionInfo, InstanceId } from './types'

// A dialable direct target with its https:// URL composed
export interface DirectCandidate extends ConnectionCandidate {
  url: string
}

/*
 * A client's view of how to reach a Media Server right now. A `direct` plan carries every
 * candidate in the matchmaker's preference order (lan before wan) plus the relay to fall back
 * to; consumers that do not walk candidates dial `url`, the preferred one.
 */
export type ConnectionPlan =
  | { kind: 'direct', url: string, candidates: DirectCandidate[], fallbackRelayUrl: string | null }
  | { kind: 'relay', url: string }
  | { kind: 'offline' }

// The port is omitted at 443, which is what a reverse proxy in front of the server would use
function buildCandidateUrl(hostname: string, port: number): string {
  return port === 443 ? `https://${hostname}` : `https://${hostname}:${port}`
}

/*
 * Asks the matchmaker how to reach a Media Server. Legacy responses predating candidates carry
 * only the single `direct` target; it is folded in as a lone wan candidate so consumers only
 * ever deal in candidates. There is deliberately no dial walk here: candidates are returned in
 * order and untested.
 */
export async function negotiateConnection(
  matchmakerUrl: string,
  instanceId: InstanceId,
  fetchImpl: typeof fetch = fetch,
): Promise<ConnectionPlan> {
  let response: Response
  try {
    response = await fetchImpl(`${matchmakerUrl}/connect/${encodeURIComponent(instanceId)}`)
  } catch (error) {
    throw new MatchmakerUnavailableError('Could not reach the matchmaker', { cause: error })
  }

  if (response.status === 404) {
    throw new ServerNotFoundError(`The matchmaker does not know the instance ${instanceId}`)
  }

  if (!response.ok) {
    throw new MatchmakerUnavailableError(`The matchmaker responded with ${response.status}`)
  }

  let info: ConnectionInfo
  try {
    info = await response.json()
  } catch (error) {
    throw new MatchmakerUnavailableError('The matchmaker response was not JSON', { cause: error })
  }

  if (!info.online) {
    return { kind: 'offline' }
  }

  const candidates: ConnectionCandidate[] = info.candidates?.length
    ? info.candidates
    : info.direct
      ? [{ kind: 'wan', hostname: info.direct.hostname, port: info.direct.port }]
      : []

  if (candidates.length) {
    const dialable = candidates.map((candidate) => ({
      ...candidate,
      url: buildCandidateUrl(candidate.hostname, candidate.port),
    }))

    return {
      kind: 'direct',
      url: dialable[0].url,
      candidates: dialable,
      fallbackRelayUrl: info.relay?.enabled ? info.relay.url : null,
    }
  }

  if (info.relay?.enabled) {
    return { kind: 'relay', url: info.relay.url }
  }

  return { kind: 'offline' }
}
