export enum RunType {
  QUICK = 'quick',
  FULL = 'full',
}

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

export enum RunLogEvent {
  RUN_STARTED = 'run_started',
  FILE_INDEXED = 'file_indexed',
  FILE_UPDATED = 'file_updated',
  FILE_SKIPPED = 'file_skipped',
  FILE_DELETED = 'file_deleted',
  FILE_ERRORED = 'file_errored',
  RUN_NO_CHANGE = 'run_no_change',
}
