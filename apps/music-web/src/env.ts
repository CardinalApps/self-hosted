import { getMode, MODE_DEV, MODE_PROD } from '@cardinalapps/ui/src/lib/env/mode'

const mode = getMode()

export const CLOUD_AUTH_HOST =
  mode === MODE_DEV ? 'http://localhost:4013' :
    mode === MODE_PROD ? 'https://auth.cardinalcloud.io' :
      null

export const HOME_SERVER_HOST =
  mode === MODE_DEV ? 'http://localhost:3080' :
    mode === MODE_PROD ? window.location.origin :
      null

// Assigned by Cardinal app registry
export const CARDINAL_PUBLIC_APP_ID = '8f11c722-b791-4427-81f0-0dc3a1927540'
export const CARDINAL_PUBLIC_APP_PERMISSIONS = '*'
