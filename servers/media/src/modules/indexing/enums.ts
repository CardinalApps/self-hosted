export enum RunStates {
  NOT_STARTED = 'not_started',
  STARTED = 'started',
  STOPPED_BY_USER = 'stopped_by_user',
  COMPLETED = 'completed',
}

export enum IndexingStates {
  IDLE = 'idle',
  INDEXING = 'indexing',
  PAUSED = 'paused',
}

export enum FileOnDiskIndexingOperation {
  ADD = 'add',
  UPDATE = 'update',
  SKIP = 'skip',
}

export enum IndexingFallbacks {
  UNKNOWN_ARTIST = 'Unknown Artist',
  UNKNOWN_RELEASE = 'Unknown Album',
  UNKNOWN_TRACK = 'Unknown Track',
}
