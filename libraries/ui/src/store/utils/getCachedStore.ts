import { RootState } from '..'
import { getStorageKey } from './getStorageKey'

/**
 * Returns the cached store from the browser's storage or a new empty object.
 */
export default function getCachedStore(): Partial<RootState> {
  const savedStoreString = localStorage.getItem(getStorageKey())

  if (savedStoreString) {
    try {
      const initialStore = JSON.parse(savedStoreString)
      return initialStore
    } catch (error) {
      console.warn('The saved store was not valid. Initializing with a new store.')
      return {}
    }
  } else {
    return {}
  }
}
