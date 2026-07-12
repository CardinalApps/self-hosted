import { CloudService, getCloudServiceURL } from '@cardinalapps/topology/src/cloudEdge'

import { getMode, MODE_DEV } from './src/lib/env/mode'

const mode = getMode()

export const CLOUD_AUTH_HOST = getCloudServiceURL(mode, CloudService.AUTH)

export const ACCOUNT_APP_HOST = getCloudServiceURL(mode, CloudService.ACCOUNT)

// Production builds are served by the user's own media server, so the host is wherever the browser
// is pointed. Dev servers run against the media server's default local port.
export const HOME_SERVER_HOST =
  mode === MODE_DEV ? 'http://localhost:3080' : window.location.origin
