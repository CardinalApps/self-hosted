/**
 * Cloud Services Access — the registry of Cardinal Cloud features whose use is
 * decided per account, and the vocabulary the auth server stores them with.
 *
 * A feature's mode is the gate itself: `gated` funnels accounts through the
 * approval queue, `open` lets everybody in. Graduating a closed beta is a mode
 * flip, not a code change, so nothing here encodes "who is allowed" — that is
 * the auth server's per-account grant.
 */

/**
 * Where an account stands with one feature. Absent grants read as `none`.
 */
export type ServiceAccessStatus = 'none' | 'pending' | 'retracted' | 'denied' | 'approved'

/**
 * A feature's gate. `open` grants every account effective access regardless of its own grant.
 */
export type ServiceAccessMode = 'gated' | 'open'

export type ServiceAccessFeatureDefinition = {
  slug: string,
  name: string,
  defaultMode: ServiceAccessMode,
}

/**
 * Every cloud feature the access endpoints accept a slug for. The mode here is
 * only the seed value — the live mode is stored by the auth server.
 */
export const serviceAccessFeatures: ServiceAccessFeatureDefinition[] = [
  {
    slug: 'remote_access_direct',
    name: 'Remote Access (Direct)',
    defaultMode: 'gated',
  },
  {
    slug: 'remote_access_relay',
    name: 'Remote Access (Relay)',
    defaultMode: 'gated',
  },
  /* Registered so it has a row to render and a mode to flip, but the Popularity Data Pool
     enforces participation on its own terms and never consults these grants. */
  {
    slug: 'popularity_data_pool',
    name: 'Popularity Data Pool',
    defaultMode: 'open',
  },
]

export const SERVICE_ACCESS_STATUSES: ServiceAccessStatus[] = ['none', 'pending', 'retracted', 'denied', 'approved']

export const SERVICE_ACCESS_MODES: ServiceAccessMode[] = ['gated', 'open']

/**
 * The two features that together gate Remote Access.
 */
export const REMOTE_ACCESS_FEATURE_SLUGS = ['remote_access_direct', 'remote_access_relay'] as const

// Looks up a registered feature, or returns undefined for an unknown slug.
export function getServiceAccessFeature(slug: string): ServiceAccessFeatureDefinition | undefined {
  return serviceAccessFeatures.find((feature) => feature.slug === slug)
}

// True when the slug names a registered feature.
export function isServiceAccessFeature(slug: string): boolean {
  return !!getServiceAccessFeature(slug)
}

// True when the feature carries a per-account server-slot override (only Remote Access does).
export function hasServerSlots(slug: string): boolean {
  return (REMOTE_ACCESS_FEATURE_SLUGS as readonly string[]).includes(slug)
}

// Folds a feature's mode together with an account's grant into the one answer callers need.
export function isEffectivelyAccessible(mode: ServiceAccessMode, status: ServiceAccessStatus): boolean {
  return mode === 'open' || status === 'approved'
}

export default serviceAccessFeatures
