import { ReleaseChannels } from '../../utils/releaseChannels'
import { HealthStates } from './enums'

export type ServerAPIVersionsAndEndpointsType = {
  versions: {
    [key: string]: string,
  },
  endpoints: string[],
}

export type ServerHealthStateType = {
  state: HealthStates,
  update?: HomeServerAge,
}

export type ServerInitType = {
  theme: string,
  serverName: string,
  sendAnonymousUsageData: boolean,
  userCardinalJWT?: string,
}

export type ServerInitResultType = {
  serverName: string,
  accountToLogInto: string,
}

export type HomeServerAge = {
  latestVersion: string,
  updateIsAvailable: boolean,
  latestVersionReleasedAt: string | null,
  daysBehindLatestVersion: number | null,
  releaseChannel: string,
}

export type HomeServerReleaseChannels = {
  current: ReleaseChannels,
}

export type LsWorkerInput = {
  // The directory to read
  dir: string,

  // How deep to read; defaults to 1
  depth?: number,

  // Optionally remove all file nodes from the list; useful for listing only
  // directories
  removeFileNodes?: boolean,

  // Optionally add an "empty node" when a directory is empty instead of
  // returning an empty array of children
  addEmptyNodes?: boolean,
}

export type LsWorkerOutput = {
  [key: string]: Record<string, unknown>,
}

export type LsEmptyNode = {
  type: 'emptyNode'
}

export type Versions = {
  nodejs?: string,
  openssl?: string,
  database?: string,
  release_channel?: string,
  cardinal_home_server?: string,
  cardinal_admin_web_app?: string,
  cardinal_music_web_app?: string,
  cardinal_photos_web_app?: string,
  cardinal_cinema_web_app?: string,
  build_tag?: string,
}

export type Instance = {
  instanceId: string,
  serverName: string,
}
