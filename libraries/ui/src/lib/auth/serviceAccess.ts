import authAPI from './authAPI'

/*
 * Cloud Services Access as a self-hosting user's own browser sees it: one grant per cloud feature,
 * decided by Cardinal. The auth server owns this vocabulary; it is mirrored here because this
 * package does not depend on the products library.
 */
export type ServiceAccessStatus = 'none' | 'pending' | 'retracted' | 'denied' | 'approved'

// A feature's gate. `open` grants every account access regardless of its own grant.
export type ServiceAccessMode = 'gated' | 'open'

export type ServiceAccessFeature = {
  slug: string,
  name: string,
  mode: ServiceAccessMode,
  status: ServiceAccessStatus,
  requestedAt: string | null,
  decidedAt: string | null,
}

// What a feature's gate looks like beside the control that uses it
export type ServiceAccessIndicator = 'loading' | 'granted' | 'queued' | 'denied' | 'unavailable'

export const REMOTE_ACCESS_DIRECT_FEATURE = 'remote_access_direct'
export const REMOTE_ACCESS_RELAY_FEATURE = 'remote_access_relay'

export const REMOTE_ACCESS_FEATURE_SLUGS = [
  REMOTE_ACCESS_DIRECT_FEATURE,
  REMOTE_ACCESS_RELAY_FEATURE,
] as const

// The code the cloud IDP refuses an ungranted account's server token with
export const SERVICE_ACCESS_REQUIRED_CODE = 'service_access_required'

// Reads the signed-in cloud account's grant for every registered feature
export async function getServiceAccess(): Promise<ServiceAccessFeature[]> {
  const res = await authAPI<{ features?: ServiceAccessFeature[] }>('/user/service-access')

  return res?.features ?? []
}

/* Withdrawing queue entries is housekeeping, never something to ask the user to retry: a failure
   only leaves a pending request behind, and the next enable attempt would file it again anyway. */
export async function retractServiceAccess(slugs: readonly string[]): Promise<void> {
  if (!slugs.length) {
    return
  }

  try {
    await authAPI('/user/service-access/retractions', 'POST', { body: { features: [...slugs] } })
  } catch (error) {
    console.warn('Could not retract cloud service access requests.', error)
  }
}

// Folds a feature's mode together with the account's grant into the one answer the UI needs
export function isEffectivelyAccessible(feature: ServiceAccessFeature): boolean {
  return feature.mode === 'open' || feature.status === 'approved'
}

/* Null grants mean the account's access has not been read yet, which reads as in-progress. Only a
   pending request is a queue entry, and only a refusal is a decision: none, retracted and a missing
   row all mean the account simply never asked, and reporting those as a wait is what let the UI
   claim a queue that the cloud knows nothing about. */
export function serviceAccessIndicator(
  features: ServiceAccessFeature[] | null,
  slug: string,
): ServiceAccessIndicator {
  if (!features) {
    return 'loading'
  }

  const feature = features.find((candidate) => candidate.slug === slug)

  if (feature && isEffectivelyAccessible(feature)) {
    return 'granted'
  }

  if (feature?.status === 'pending') {
    return 'queued'
  }

  return feature?.status === 'denied' ? 'denied' : 'unavailable'
}

/* True while the account is waiting on Cardinal to decide either Remote Access path. Defined in
   terms of the indicator so a row's icon and the card's alert cannot describe different states. */
export function isQueuedForRemoteAccess(features: ServiceAccessFeature[] | null): boolean {
  return REMOTE_ACCESS_FEATURE_SLUGS.some((slug) => serviceAccessIndicator(features, slug) === 'queued')
}

/* True when a failure was the access gate rather than a real error. The refusal starts at the cloud
   IDP and reaches the browser through the Media Server, so the code is matched wherever it lands:
   as the body's code, folded into a passed-through message, or as a bare string body. */
export function isServiceAccessRefusal(error: unknown): boolean {
  const data = (error as { data?: unknown } | undefined)?.data
  const body = data && typeof data === 'object' ? data as { code?: unknown, message?: unknown } : undefined

  const candidates = [
    typeof data === 'string' ? data : undefined,
    body?.code,
    body?.message,
    error instanceof Error ? error.message : undefined,
  ]

  return candidates.some((candidate) =>
    typeof candidate === 'string' && candidate.includes(SERVICE_ACCESS_REQUIRED_CODE))
}
