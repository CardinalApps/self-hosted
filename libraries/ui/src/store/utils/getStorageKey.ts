/**
 * Problem 1: In the self-hosted setup all apps will share the same localStorage
 * space, so each app needs a unique storage key.
 * 
 * Problem 2: The Redux store object must be initialized in the UI package if we
 * want to export a RootState type that all packages can use, therefore we
 * cannot wrap the store initialization in a factory function that consumers can
 * use to initialize a store with a unique storage key.
 * 
 * Solution: Read the URL to detect the app and determine the storage key.
 */
export const getStorageKey = () => {
  const path = window.location.pathname

  if (path.startsWith('/admin')) {
    return '@cardinalapps/admin'
  } else if (path.startsWith('/photos')) {
    return '@cardinalapps/photos'
  } else if (path.startsWith('/music')) {
    return '@cardinalapps/music'
  } else if (path.startsWith('/cinema')) {
    return '@cardinalapps/cinema'
  } else {
    return '@cardinalapps/webapp'
  }
}
