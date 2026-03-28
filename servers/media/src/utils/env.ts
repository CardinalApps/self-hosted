import * as os from 'os'
import * as fs from 'fs'
import * as path from 'path'
import * as osenv from 'osenv'

import { MediaType, MediaDirsType } from './media'

/**
 * All supported environments.
 */
export enum Env {
  CONTAINER = 'container',
  LINUX = 'linux',
  //darwin = 'darwin',
  //win32 = 'win32',
}

/**
 * All supported modes.
 */
export enum Mode {
  PRODUCTION = 'production',
  DEVELOPMENT = 'development',
}

/**
 * All env vars.
 */
export type ENV_VAR =
  // Internal
  'NODE_ENV' |
  'BUILD_TAG' |
  'RELEASE_CHANNEL' |
  'CARDINAL_HOME_SERVER_PORT' |
  'CARDINAL_CONTAINER' |
  'KIOSK_MODE' |

  // Publicly documented
  'CARDINAL_POSTGRES' |
  'POSTGRES_HOST' |
  'POSTGRES_PORT' |
  'POSTGRES_USER' |
  'POSTGRES_PASSWORD' |
  'POSTGRES_DATABASE' |
  'POSTGRES_SSL' |
  'HTTP_LOG_LEVEL' |
  'EVENTS_LOG_LEVEL' |
  'INDEXING_LOG_LEVEL' |
  'JOBS_LOG_LEVEL' |
  'TRANSCODER_LOG_LEVEL' |
  'DATABASE_LOG_LEVEL' |
  'INDEXING_SCAN_TIMEOUT' |
  'HEIF_CONVERSION_TIMEOUT' |
  'MAX_CONCURRENT_JOBS' |
  'MUSIC_DIR' |
  'PHOTOS_DIR' |
  'MOVIES_DIR' |
  'TV_DIR' |
  'SIGNING_SECRET'

/**
 * Returns the value of an environment variable, or the supplied fallback value.
 * 
 * @param variable - The variable to look up.
 * @param fallback - Value to return if the env variable is not defined.
 */
export function envVar<T>(variable: ENV_VAR, fallback: T): string | number | boolean | T {
  if (!!process?.env && variable in process.env) {
    const found = process.env[variable]
    switch (found) {
      case 'true':
      case 'TRUE':
        return true

      case 'false':
      case 'FALSE':
        return false

      default:
        // FIXME this isn't good enough
        if (!isNaN(Number(found))) {
          return Number(found)
        } else {
          return found
        }
    }
  } else {
    return fallback
  }
}

/**
 * Checks if the current env is a container. Depends on `CARDINAL_CONTAINER`
 * having been defined in the Dockerfile.
 */
export function isContainerEnv(): boolean {
  return envVar('CARDINAL_CONTAINER', false) as boolean
}

/**
 * Returns the name of the current environment. A container running in another
 * env will still resolve to the `container` env.
 */
export function getCurrentEnv(): Env | string {
  if (isContainerEnv()) {
    return Env.CONTAINER
  } else {
    return os.platform()
  }
}

/**
 * Returns the name of the current mode.
 */
export function getCurrentMode(): Mode {
  return envVar('NODE_ENV', Mode.PRODUCTION) as Mode
}

/**
 * Each env has a place where installed apps can save files.
 * 
 * @param suffix - An array of paths to add to the end.
 */
export function getAppDir(...args): string {
  switch (getCurrentEnv()) {
    case Env.CONTAINER:
      return path.join('/config', ...args)

    case Env.LINUX:
      if (getCurrentMode() === Mode.DEVELOPMENT) {
        return path.join(osenv.home(), '.config', 'cardinal-media-server-dev', ...args)
      } else {
        return path.join(osenv.home(), '.config', 'cardinal-media-server', ...args)
      }

    default:
      throw new Error('Unable to determine app directory for current environment.')
  }
}

/**
 * This is the Nest.js public folder for serving files.
 * 
 * @param suffix - An array of paths to add to the end.
 */
export function getPublicDir(...args): string {
  return path.join(__dirname, '..', '..', 'public', ...args)
}

/**
 * Ensures that the main app directory exists and is writable.
 * 
 * @param dir - An array of directory paths, without separators.
 * @param base - Base path, with the correct platform separators.
 */
export function touchAppDir(dir = [''], base = getAppDir()): void {
  const dirToTouch = path.join(base, ...dir)
  try {
    fs.mkdirSync(dirToTouch, { recursive: true })
  } catch(error) {
    throw new Error(`Could not touch directory: ${dirToTouch}`)
  }
}

/**
 * Returns the path to a media directory in the container. In order to keep the
 * Docker snippets as small as possible for users, the media is mounted to the
 * root.
 */
export function getMediaDirInContainer(mediaType: MediaType): string {
  if (!isContainerEnv()) throw new Error('Cannot use getMediaDirInContainer() outside of a container')

  switch (mediaType) {
    case MediaType.MUSIC:
      return '/music'
    case MediaType.PHOTOS:
      return '/photos'
    case MediaType.MOVIES:
      return '/movies'
    case MediaType.TV:
      return '/tv'
  }
}

/**
 * Checks which media dirs have been mounted in the container.
 */
export function getMountedMediaTypesInContainer(): MediaType[] {
  if (!isContainerEnv()) throw new Error('Cannot use getMountedMediaTypesInContainer() outside of a container')

  const mountedEnvs = []

  Object.values(MediaType).forEach((mediaType) => {
    if (fs.existsSync(getMediaDirInContainer(mediaType))) {
      mountedEnvs.push(mediaType)
    }
  })

  return mountedEnvs
}

/**
 * Returns the media dirs that the user gave.
 */
export function getMediaDirs(): MediaDirsType {
  if (getCurrentEnv() === Env.CONTAINER) {
    const mounted = getMountedMediaTypesInContainer()
    return {
      music: mounted.includes(MediaType.MUSIC) ? getMediaDirInContainer(MediaType.MUSIC) : undefined,
      photos: mounted.includes(MediaType.PHOTOS) ? getMediaDirInContainer(MediaType.PHOTOS) : undefined,
      movies: mounted.includes(MediaType.MOVIES) ? getMediaDirInContainer(MediaType.MOVIES) : undefined,
      tv: mounted.includes(MediaType.TV) ? getMediaDirInContainer(MediaType.TV) : undefined,
    }
  } else {
    return {
      music: envVar('MUSIC_DIR', undefined),
      photos: envVar('PHOTOS_DIR', undefined),
      movies: envVar('MOVIES_DIR', undefined),
      tv: envVar('TV_DIR', undefined),
    }
  }
}

/**
 * Returns the path to the SQLite database, which is in the environment's
 * filesystem.
 */
export function getSQLiteDatabaseLocation(): string {
  return getAppDir('db', 'cardinal-media-server.sqlite3.db')
}
