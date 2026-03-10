export enum CardinalApp {
  ADMIN = 'admin',
  MUSIC = 'music',
  PHOTOS = 'photos',
  CINEMA = 'cinema',
}

export const AppBasePaths = {
  [CardinalApp.ADMIN]: '/admin',
  [CardinalApp.MUSIC]: '/music',
  [CardinalApp.PHOTOS]: '/photos',
  [CardinalApp.CINEMA]: '/cinema',
}

export enum CardinalEnv {
  DESKTOP = 'desktop', // When running in Electron
  CLOUD = 'cloud', // When hosted by photos.cardinalapps.io
  HOME_SERVER = 'home_server', // When self-hosted by the user
  VANILLA = 'vanilla', // When started by create-react-app
}

/**
 * Gets the app base path from the URL (see AppBasePaths). This can return
 * undefined in some cases, like the sandbox app in storybook or in kiosk mode.
 */
export const getAppBasePathFromUrl = (): string | undefined => {
  let found = undefined

  if (typeof window !== 'undefined') {
    for (const [app, basePath] of Object.entries(AppBasePaths)) {
      if (window.location.pathname.startsWith(basePath)) {
        found = app
      }
    }
  }

  return found
}
