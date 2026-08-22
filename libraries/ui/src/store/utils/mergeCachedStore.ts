import mergeWith from 'lodash.mergewith'

/**
 * Overlays the store cached in the browser onto a fresh default store, in place.
 *
 * Objects are merged key by key so that a slice gains any fields added since the cache was
 * written. Lists are not: a cached list is the whole list, and merging it into the default one
 * index by index would put back entries the user removed.
 */
export default function mergeCachedStore<T extends object>(defaults: T, cached: unknown): T {
  return mergeWith(defaults, cached, (defaultValue, cachedValue) => (
    Array.isArray(cachedValue) ? cachedValue : undefined
  ))
}
