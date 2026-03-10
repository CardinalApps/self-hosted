import { IndexingStates } from './enums'
import { MediaType } from '../../utils/media'
import { User } from '../user/user.entity'

export type NewRunOptions = {
  user: Partial<User>,
  mediaTypes: {
    [key in MediaType]: boolean
  }
}

/**
 * The shape of a run while actively running and using in-memory storage.
 */
export type InMemoryRun = {
  runId: string,
  user: Partial<User>,
  startedAt: number,
  options: NewRunOptions,
  music: {
    found: string[],
    indexed: string[],
    added: string[],
    skipped: string[],
    errored: string[],
  },
  photos: {
    found: string[],
    indexed: string[],
    added: string[],
    skipped: string[],
    errored: string[],
  },
  movies: {
    found: string[],
    indexed: string[],
    added: string[],
    skipped: string[],
    errored: string[],
  },
  tv: {
    found: string[],
    indexed: string[],
    added: string[],
    skipped: string[],
    errored: string[],
  },
}

/**
 * The shape of a run while actively running and using in-memory storage.
 */
export type InMemoryRunPublic = {
  runId: string,
  startedAt: number,
  options: NewRunOptions,
  music: {
    found: number,
    indexed: number,
    added: number,
    skipped: number,
    errored: number,
  },
  photos: {
    found: number,
    indexed: number,
    added: number,
    skipped: number,
    errored: number,
  },
  movies: {
    found: number,
    indexed: number,
    added: number,
    skipped: number,
    errored: number,
  },
  tv: {
    found: number,
    indexed: number,
    added: number,
    skipped: number,
    errored: number,
  },
}

/**
 * Queue items for the main indexing operation.
 */
export type FileToIndexInQueue = {
  path: string,
  mediaType: MediaType,
}

/**
 * What is returned to the client apps when they request the state of indexing.
 */
export type GETIndexStateResponse = {
  state: IndexingStates,
  [key: string]: unknown,
}

export type MusicMetadataSource = 'embedded' | 'fs-stat' | 'fs-structure'

/**
 * All of the things that can be derived from a music file's folder structure.
 * Strings are used for easy SQLite compatability.
 */
export type MusicFileSystemStructureMetadata = {
  trackName?: string,
  trackNumber?: number,
  releaseName?: string,
  releaseYear?: number,
  artistName?: string,
  discNumber?: number,
}

export type MetadataNumberOf = {
  no: number,
  of: number,
}
