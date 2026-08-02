import { MediaServerCapability } from '@cardinalapps/access-control/src'

import useHasCapability from './useHasCapability'
import { CardinalApp } from '../lib/env/cardinal'

// The capability required to log into and see the contents of each app.
export function appLoginCapability(app: CardinalApp): MediaServerCapability {
  switch (app) {
    case CardinalApp.ADMIN: return 'AdminApp.Login'
    case CardinalApp.MUSIC: return 'MusicApp.Login'
    case CardinalApp.PHOTOS: return 'PhotosApp.Login'
    case CardinalApp.CINEMA: return 'CinemaApp.Login'
  }
}

// Whether the current user may enter the given app. Derived synchronously from
// the hydrated user, so it can gate the private tree without a render flash.
export function useCanLogIntoApp(app: CardinalApp) {
  return useHasCapability(appLoginCapability(app))
}

export default useCanLogIntoApp
