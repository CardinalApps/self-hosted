export enum IndexingEvents {
  START = `indexing.start`,
  STARTED = `indexing.started`,
  PAUSED = `indexing.paused`,
  RESUMED = `indexing.resumed`,
  STOPPED = `indexing.stopped`,
  SCAN_STARTED = `indexing.scan_started`,
  FILES_FOUND = `indexing.files_found`,
  FILE_INDEXED = `indexing.file_indexed`,
  FILE_SKIPPED = `indexing.file_skipped`,
  FILE_UPDATED = `indexing.file_updated`,
  FILE_ERRORED = `indexing.file_errored`,
  SCAN_COMPLETED = `indexing.scan_completed`,
  PHOTO_ADDED = `indexing.photo_added`,
  MUSIC_TRACK_ADDED = `indexing.music_track_added`,
  MUSIC_ARTIST_ADDED = `indexing.music_artist_added`,
  MUSIC_RELEASE_ADDED = `indexing.music_release_added`,
  CURRENT_PROGRESS = `indexing.current_progress`,
  COMPLETED = `indexing.completed`,
}

export type IndexingStartedPayload = {
  runId: string,
  startedAt: number,
}

export type ScannerStartedPayload = {
  runId: string,
}

export type ScannerFoundFilesPayload = {
  filesFound: number,
}

export interface ScannerCompletedPayload {
  runId: string,
  numFound: number,
  musicFound: number,
  photosFound: number,
  moviesFound: number,
  tvFound: number,
}
