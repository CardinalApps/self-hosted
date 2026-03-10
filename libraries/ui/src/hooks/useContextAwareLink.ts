import { useSelector } from 'react-redux'

import { appSelectors } from '../store/slices/app'

import { AppBasePaths } from '../lib/env/cardinal'

/**
 * Handles the base path in a link according to the env.
 * 
 * @param {APPS} destinationApp - The app we want to go to.
 * @param {string} path - The path we want to go to, **not** including the base path, with a leading slash. E.g., /albums
 * @returns {{ internal: boolean, path: string }}
 */
export default function useContextAwareLink(destinationApp, path) {
  const currentApp = useSelector(appSelectors.app)

  // add the external base path when navigating to another app
  if (currentApp !== destinationApp) {
    return {
      internal: false,
      path: `${AppBasePaths[destinationApp]}${path}`,
    }
  }

  return {
    internal: true,
    path,
  }
}
