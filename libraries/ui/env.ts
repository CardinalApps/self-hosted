import { getMode, MODE_DEV, MODE_PROD } from './src/lib/env/mode'

const mode = getMode()

export const CLOUD_AUTH_HOST =
  mode === MODE_DEV ? "http://localhost:4013" :
    mode === MODE_PROD ? 'https://auth.cardinalcloud.io' :
      null

export const ACCOUNT_APP_HOST =
  mode === MODE_DEV ? 'http://localhost:3077' :
    mode === MODE_PROD ? 'https://account.cardinalapps.io' :
      null

export const HOME_SERVER_HOST =
  mode === MODE_DEV ? 'http://localhost:3080' :
    mode === MODE_PROD ? window.location.origin :
      null
