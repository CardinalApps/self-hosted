import { createSlice, PayloadAction } from '@reduxjs/toolkit'

import { STORE_KEY } from './constants'

import fetchTotalFileCounts from './thunks/fetchTotalFileCounts'

export type ServerStatus = 'indexing' | 'paused' | 'idle' | 'completed'

export type SSEIndexingUpdate = {
  state: ServerStatus,
  startedAt: number,
  music?: {
    found: number,
    indexed: number,
    skipped: number,
    errored: number,
  },
  photos?: {
    found: number,
    indexed: number,
    skipped: number,
    errored: number,
  },
  movies?: {
    found: number,
    indexed: number,
    skipped: number,
    errored: number,
  },
  tv?: {
    found: number,
    indexed: number,
    skipped: number,
    errored: number,
  },
}

type IndexingSliceState = {
  serverState: ServerStatus | null,
  startedAt: number | null,
  filesFound: number,
  filesIndexed: number,
  filesSkipped: number,
  filesErrored: number,
  totalMusicFilesIndexed: number,
  totalPhotoFilesIndexed: number,
  totalMovieFilesIndexed: number,
  totalTVFilesIndexed: number,
  musicFound: number,
  musicIndexed: number,
  musicSkipped: number,
  musicErrored: number,
  photosFound: number,
  photosIndexed: number,
  photosSkipped: number,
  photosErrored: number,
  moviesFound: number,
  moviesIndexed: number,
  moviesSkipped: number,
  moviesErrored: number,
  tvFound: number,
  tvIndexed: number,
  tvSkipped: number,
  tvErrored: number,
}

export const initialState: IndexingSliceState = {
  serverState: null,
  startedAt: null,
  filesFound: 0,
  filesIndexed: 0,
  filesSkipped: 0,
  filesErrored: 0,
  totalMusicFilesIndexed: 0,
  totalPhotoFilesIndexed: 0,
  totalMovieFilesIndexed: 0,
  totalTVFilesIndexed: 0,
  musicFound: 0,
  musicIndexed: 0,
  musicSkipped: 0,
  musicErrored: 0,
  photosFound: 0,
  photosIndexed: 0,
  photosSkipped: 0,
  photosErrored: 0,
  moviesFound: 0,
  moviesIndexed: 0,
  moviesSkipped: 0,
  moviesErrored: 0,
  tvFound: 0,
  tvIndexed: 0,
  tvSkipped: 0,
  tvErrored: 0,
}

const indexingSlice = createSlice({
  name: STORE_KEY,
  initialState,
  reducers: {
    setServerState: (state, action: PayloadAction<SSEIndexingUpdate>) => {
      const { payload } = action
      state.serverState = payload?.state
      state.startedAt = payload?.startedAt || null
      state.filesFound = (
        payload?.music?.found
        + payload?.photos?.found
        + payload?.movies?.found
        + payload?.tv?.found
      ) || 0
      state.filesIndexed = (
        payload?.music?.indexed
        + payload?.photos?.indexed
        + payload?.movies?.indexed
        + payload?.tv?.indexed
      ) || 0
      state.filesSkipped = (
        payload?.music?.skipped
        + payload?.photos?.skipped
        + payload?.movies?.skipped
        + payload?.tv?.skipped
      ) || 0
      state.filesErrored = (
        payload?.music?.errored
        + payload?.photos?.errored
        + payload?.movies?.errored
        + payload?.tv?.errored
      ) || 0
      state.musicFound = payload?.music?.found
      state.musicIndexed = payload?.music?.indexed
      state.musicSkipped = payload?.music?.skipped
      state.musicErrored = payload?.music?.errored
      state.photosFound = payload?.photos?.found
      state.photosIndexed = payload?.photos?.indexed
      state.photosSkipped = payload?.photos?.skipped
      state.photosErrored = payload?.photos?.errored
      state.moviesFound = payload?.movies?.found
      state.moviesIndexed = payload?.movies?.indexed
      state.moviesSkipped = payload?.movies?.skipped
      state.moviesErrored = payload?.movies?.errored
      state.tvFound = payload?.tv?.found
      state.tvIndexed = payload?.tv?.indexed
      state.tvSkipped = payload?.tv?.skipped
      state.tvErrored = payload?.tv?.errored
    },
  },
  extraReducers: (builder) => builder
    .addCase('sse/indexing.started', (state, action) => {
      const { payload } = action as unknown as {
        payload: { startedAt?: number }
      }
      state.serverState = 'indexing'
      state.startedAt = payload?.startedAt || null
      state.filesFound = 0
      state.filesIndexed = 0
      state.filesSkipped = 0
      state.filesErrored = 0
      state.musicFound = 0
      state.musicIndexed = 0
      state.musicSkipped = 0
      state.musicErrored = 0
      state.photosFound = 0
      state.photosIndexed = 0
      state.photosSkipped = 0
      state.photosErrored = 0
      state.moviesFound = 0
      state.moviesIndexed = 0
      state.moviesSkipped = 0
      state.moviesErrored = 0
      state.tvFound = 0
      state.tvIndexed = 0
      state.tvSkipped = 0
      state.tvErrored = 0
    })
    .addCase('sse/indexing.resumed', (state) => {
      state.serverState = 'indexing'
    })
    .addCase('sse/indexing.paused', (state) => {
      state.serverState = 'paused'
    })
    .addCase('sse/indexing.stopped', (state) => {
      state.serverState = 'idle'
      state.startedAt = null
      state.filesFound = 0
      state.filesIndexed = 0
      state.filesSkipped = 0
      state.filesErrored = 0
      state.musicFound = 0
      state.musicIndexed = 0
      state.musicSkipped = 0
      state.musicErrored = 0
      state.photosFound = 0
      state.photosIndexed = 0
      state.photosSkipped = 0
      state.photosErrored = 0
      state.moviesFound = 0
      state.moviesIndexed = 0
      state.moviesSkipped = 0
      state.moviesErrored = 0
      state.tvFound = 0
      state.tvIndexed = 0
      state.tvSkipped = 0
      state.tvErrored = 0
    })
    .addCase('sse/indexing.scan_started', (state) => {
      state.filesFound = 0
      state.filesIndexed = 0
      state.filesErrored = 0
    })
    // @ts-expect-error how to type sse events?
    .addCase('sse/indexing.scan_completed', (state, action: PayloadAction<SSEIndexingUpdate>) => {
      const { payload } = action
      state.filesFound = (
        payload?.music?.found
        + payload?.photos?.found
        + payload?.movies?.found
        + payload?.tv?.found
      ) || 0
      state.filesIndexed = (
        payload?.music?.indexed
        + payload?.photos?.indexed
        + payload?.movies?.indexed
        + payload?.tv?.indexed
      ) || 0
      state.filesSkipped = (
        payload?.music?.skipped
        + payload?.photos?.skipped
        + payload?.movies?.skipped
        + payload?.tv?.skipped
      ) || 0
      state.filesErrored = (
        payload?.music?.errored
        + payload?.photos?.errored
        + payload?.movies?.errored
        + payload?.tv?.errored
      ) || 0
      state.musicFound = payload?.music?.found
      state.photosFound = payload?.photos?.found
      state.moviesFound = payload?.movies?.found
      state.tvFound = payload?.tv?.found
    })
    .addCase('sse/indexing.completed', (state) => {
      state.serverState = 'completed'
      state.startedAt = null
    })
    .addCase('sse/indexing.files_found', (state, action) => {
      const { payload } = action as unknown as {
        payload: { filesFound?: number }
      }
      state.filesFound = payload?.filesFound
    })
    // @ts-expect-error how to type sse events?
    .addCase('sse/indexing.current_progress', (state, action: PayloadAction<SSEIndexingUpdate>) => {
      const { payload } = action
      state.filesFound = (
        payload?.music?.found
        + payload?.photos?.found
        + payload?.movies?.found
        + payload?.tv?.found
      ) || 0
      state.filesIndexed = (
        payload?.music?.indexed
        + payload?.photos?.indexed
        + payload?.movies?.indexed
        + payload?.tv?.indexed
      ) || 0
      state.filesSkipped = (
        payload?.music?.skipped
        + payload?.photos?.skipped
        + payload?.movies?.skipped
        + payload?.tv?.skipped
      ) || 0
      state.filesErrored = (
        payload?.music?.errored
        + payload?.photos?.errored
        + payload?.movies?.errored
        + payload?.tv?.errored
      ) || 0
      state.musicFound = payload?.music?.found
      state.musicIndexed = payload?.music?.indexed
      state.musicSkipped = payload?.music?.skipped
      state.musicErrored = payload?.music?.errored
      state.photosFound = payload?.photos?.found
      state.photosIndexed = payload?.photos?.indexed
      state.photosSkipped = payload?.photos?.skipped
      state.photosErrored = payload?.photos?.errored
      state.moviesFound = payload?.movies?.found
      state.moviesIndexed = payload?.movies?.indexed
      state.moviesSkipped = payload?.movies?.skipped
      state.moviesErrored = payload?.movies?.errored
      state.tvFound = payload?.tv?.found
      state.tvIndexed = payload?.tv?.indexed
      state.tvSkipped = payload?.tv?.skipped
      state.tvErrored = payload?.tv?.errored
    })
    .addCase(fetchTotalFileCounts.fulfilled, (state, action) => {
      const { payload } = action as unknown as {
        payload: {
          musicFiles: number,
          photoFiles: number,
          movieFiles: number,
          tvFiles: number,
        },
      }
      state.totalMusicFilesIndexed = payload.musicFiles
      state.totalPhotoFilesIndexed = payload.photoFiles
      state.totalMovieFilesIndexed = payload.movieFiles
      state.totalTVFilesIndexed = payload.tvFiles
    }),
  selectors: {
    serverState: (state) => state.serverState,
    startedAt: (state) => state.startedAt,
    filesFound: (state) => state.filesFound,
    filesIndexed: (state) => state.filesIndexed,
    filesSkipped: (state) => state.filesSkipped,
    filesErrored: (state) => state.filesErrored,
    totalMusicFilesIndexed: (state) => state.totalMusicFilesIndexed,
    totalPhotoFilesIndexed: (state) => state.totalPhotoFilesIndexed,
    totalMovieFilesIndexed: (state) => state.totalMovieFilesIndexed,
    totalTVFilesIndexed: (state) => state.totalTVFilesIndexed,
    musicFound: (state) => state.musicFound,
    musicIndexed: (state) => state.musicIndexed,
    musicSkipped: (state) => state.musicSkipped,
    musicErrored: (state) => state.musicErrored,
    photosFound: (state) => state.photosFound,
    photosIndexed: (state) => state.photosIndexed,
    photosSkipped: (state) => state.photosSkipped,
    photosErrored: (state) => state.photosErrored,
    moviesFound: (state) => state.moviesFound,
    moviesIndexed: (state) => state.moviesIndexed,
    moviesSkipped: (state) => state.moviesSkipped,
    moviesErrored: (state) => state.moviesErrored,
    tvFound: (state) => state.tvFound,
    tvIndexed: (state) => state.tvIndexed,
    tvSkipped: (state) => state.tvSkipped,
    tvErrored: (state) => state.tvErrored,
  },
})

export const indexingSelectors = indexingSlice.selectors
export const indexingActions = indexingSlice.actions

export default indexingSlice
