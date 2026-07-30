import queryParams from '../../lib/net/queryParams'
import { baseHomeServerApi } from './baseHomeServerApi'

import { getNextPageParam, getPreviousPageParam, ITEMS_PER_RTK_PAGE } from '../utils/infiniteScroll'
import { CommonOrderParams, PaginationParams } from '../types/api'
import { ToolbarOrderByType } from '../../components/interaction/Toolbar/types'

export type MusicAritstsOrderBy = Extract<ToolbarOrderByType,
  'createdAt'
  | 'name'
>
export type MusicArtistFormatType = {
  extension: string,
  numTracks: number,
  bytes: number,
  avgBitrate: number | null,
  minDuration: number | null,
  maxDuration: number | null,
}

export type MusicArtistReleaseListeningType = {
  musicReleaseId: string,
  numTracks: number,
  tracksHeard: number,
  plays: number,
  favorites: number,
  lastPlayedAt: string | null,
}

export type MusicArtistReleaseSummaryType = {
  id: number,
  musicReleaseId: string,
  title: string | null,
  releaseType: string | null,
  hasArtwork: boolean,
  /** The consensus year across the release's tracks, from embedded tags. */
  year: number | null,
  numTracks: number,
  runtimeSeconds: number,
  bytes: number,
  extensions: string[],
  lossless: boolean,
}

export type MusicArtistTrackFileType = {
  musicTrackId: string,
  musicReleaseId: string | null,
  title: string | null,
  bytes: number,
  extension: string,
  lossless: boolean,
}

export type MusicArtistListeningType = {
  plays: number,
  tracksHeard: number,
  favorites: number,
  firstPlayedAt: string | null,
  lastPlayedAt: string | null,
  releases: MusicArtistReleaseListeningType[],
}

/**
 * Mirrors MusicArtistSummary on the Media Server. Only present when the request
 * asked for `summary`; `listening` only when a user was logged in.
 */
export type MusicArtistSummaryType = {
  numReleases: number,
  numTracks: number,
  runtimeSeconds: number,
  shortestTrackSeconds: number | null,
  longestTrackSeconds: number | null,
  firstYear: number | null,
  lastYear: number | null,
  genres: { name: string, numReleases: number }[],
  labels: string[],
  bytes: number,
  formats: MusicArtistFormatType[],
  numLossless: number,
  sampleRates: number[],
  bitDepths: number[],
  encoders: string[],
  mediaTypes: string[],
  countries: string[],
  integratedLufs: number | null,
  truePeakDb: number | null,
  musicbrainzArtistId: string | null,
  releases: MusicArtistReleaseSummaryType[],
  /** One entry per track that has an indexed file; the DiskMap is drawn from these. */
  files: MusicArtistTrackFileType[],
  listening?: MusicArtistListeningType,
}

export type MusicArtistType = {
  id: number,
  name: string,
  musicArtistId?: string,
  releases: Record<string, unknown>[],
  tracks: Record<string, unknown>[],
  summary?: MusicArtistSummaryType,
  [key: string]: unknown,
}

export const musicArtistsApi = baseHomeServerApi
  .enhanceEndpoints({
    addTagTypes: ['list', 'MusicArtists'],
  })
  .injectEndpoints({
    endpoints: (builder) => ({
      /**
       * Infinite scroll.
       */
      getInfiniteMusicArtists: builder.infiniteQuery<
        [MusicArtistType[], number],
        {
          orderBy?: MusicAritstsOrderBy,
          order?: CommonOrderParams,
          libraries?: string[],
        },
        PaginationParams
      >({
        infiniteQueryOptions: {
          initialPageParam: {
            take: ITEMS_PER_RTK_PAGE,
            skip: 0,
          },
          maxPages: 4,
          getNextPageParam,
          getPreviousPageParam,
        },
        query({ queryArg, pageParam }) {
          const { orderBy, order, libraries } = queryArg
          const { take, skip } = pageParam
          return queryParams('/music/artists', {
            ...(typeof skip !== 'undefined' && { skip }),
            ...(take && { take }),
            ...(orderBy && { orderBy }),
            ...(order && { order }),
            ...(libraries && { libraries }),
            releases: true,
            tracks: true,
          })
        },
      }),

      /**
       * Queries.
       */
      getMusicArtists: builder.query<
        [MusicArtistType[], number],
        PaginationParams & {
          tracks?: boolean,
          metadata?: boolean,
          releases?: boolean,
          order?: CommonOrderParams,
          orderBy?: 'name' | 'createdAt',
        }
      >({
        query: ({ take, skip, order, orderBy, tracks, metadata, releases }) => {
          return queryParams('/music/artists', {
            ...(take && { take }),
            ...(skip && { skip }),
            ...(order && { order }),
            ...(orderBy && { orderBy }),
            ...(tracks && { tracks }),
            ...(releases && { releases }),
            ...(metadata && { metadata }),
          })
        },
      }),

      /**
       * Get one.
       */
      getMusicArtist: builder.query<
        MusicArtistType,
        {
          id: string,
          releases?: boolean,
          tracks?: boolean,
          metadata?: boolean,
          summary?: boolean,
          playCount?: boolean,
          rating?: boolean,
        }
      >({
        /* Artist payloads are expensive to compute server-side, so revisits within a session
           reuse the cached copy instead of refetching. A reload always refetches; the persisted
           store drops the whole api slice on rehydration. */
        keepUnusedDataFor: 600,
        query: ({ id, releases, tracks, metadata, summary, playCount, rating }) => {
          return queryParams(`/music/artist/${id}`, {
            ...(typeof releases === 'boolean' && { releases }),
            ...(typeof tracks === 'boolean' && { tracks }),
            ...(typeof metadata === 'boolean' && { metadata }),
            ...(summary && { summary }),
            ...(playCount && { playCount }),
            ...(rating && { rating }),
          })
        },
        providesTags: ['MusicArtists'],
      }),
    }),
  })

export const {
  useGetInfiniteMusicArtistsInfiniteQuery,
  useGetMusicArtistQuery,
  useGetMusicArtistsQuery,
  useLazyGetMusicArtistQuery,
  useLazyGetMusicArtistsQuery,
} = musicArtistsApi
