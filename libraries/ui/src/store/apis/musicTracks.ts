import { ToolbarOrderByType } from '../../components/interaction/Toolbar/types'
import queryParams from '../../lib/net/queryParams'
import { CommonOrderParams, PaginationParams } from '../types/api'
import { getNextPageParam, getPreviousPageParam, ITEMS_PER_RTK_PAGE } from '../utils/infiniteScroll'
import { baseHomeServerApi } from './baseHomeServerApi'

export type MusicTracksOrderBy = Extract<ToolbarOrderByType,
  'createdAt'
  | 'title'
  | 'duration'
  | 'bitrate'
  | 'playCount'
  | 'trackNumber'
  | 'rating'
>
export type MusicTrackWaveformType = {
  version: number,
  binCount: number,
  data: {
    channels: {
      peak: string,
      rms: string,
      low: string,
      mid: string,
      high: string,
    },
    scales: {
      peak: number,
      rms: number,
      bands: number,
    },
  },
  integratedLufs: number | null,
  truePeakDb: number | null,
  silenceLeadIn: number | null,
  silenceLeadOut: number | null,
}

export type MusicTrackType = {
  id: number,
  musicTrackId: string,
  title: string,
  trackNumber: number,
  discNumber: number,
  playCount: number,
  rating?: number | null,
  release: {
    title: string,
    musicReleaseId: string,
    thumbnails: Record<string, unknown>[],
    id: number,
    releaseId: string,
  }
  artists: Array<{
    name: string,
  }>,
  thumbnails?: string[],
  [key: string]: unknown,
}

export const musicTracksApi = baseHomeServerApi
  .enhanceEndpoints({
    addTagTypes: ['list', 'MusicTracks'],
  })
  .injectEndpoints({
    endpoints: (builder) => ({
      /**
       * Infinite scroll.
       */
      getInfiniteMusicTracks: builder.infiniteQuery<
        [MusicTrackType[], number],
        {
          orderBy?: MusicTracksOrderBy,
          order?: CommonOrderParams,
          release?: boolean,
          metadata?: boolean
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
          const { release, metadata, orderBy, order, libraries } = queryArg
          const { take, skip } = pageParam
          return queryParams('/music/tracks', {
            ...(typeof skip !== 'undefined' && { skip }),
            ...(take && { take }),
            ...(orderBy && { orderBy }),
            ...(order && { order }),
            ...(release && { release }),
            ...(metadata && { metadata }),
            ...(libraries && { libraries }),
          })
        },
      }),

      /**
       * Get many.
       */
      getMusicTracks: builder.query<
        [MusicTrackType[], number],
        PaginationParams & {
          orderBy?: MusicTracksOrderBy,
          order?: CommonOrderParams,
          release?: boolean,
          metadata?: boolean,
          libraries?: string[],
          releasedSince?: string,
        }
      >({
        query: ({ take, skip, release, metadata, orderBy, order, libraries, releasedSince }) => {
          return queryParams('/music/tracks', {
            ...(typeof skip !== 'undefined' && { skip }),
            ...(take && { take }),
            ...(orderBy && { orderBy }),
            ...(order && { order }),
            ...(release && { release }),
            ...(metadata && { metadata }),
            ...(libraries && { libraries }),
            ...(releasedSince && { releasedSince }),
          })
        },
        providesTags: ['MusicTracks'],
      }),

      /**
       * Get one.
       */
      getMusicTrack: builder.query<
        MusicTrackType,
        { id: string }
      >({
        query: ({ id }) => {
          return queryParams(`/music/track/${id}`)
        },
        providesTags: ['MusicTracks'],
      }),

      /**
       * Get the waveform of a track. A 202 means the server has started
       * generating it; the data arrives later via the `music.waveform_ready`
       * server-sent event, which upserts into this endpoint's cache.
       */
      getMusicTrackWaveform: builder.query<
        MusicTrackWaveformType | null,
        { id: string }
      >({
        query: ({ id }) => ({
          url: queryParams(`/music/track/${id}/waveform`),
          responseHandler: async (response) => (response.status === 202 ? null : response.json()),
        }),
      }),
    }),
  })

export const {
  useGetInfiniteMusicTracksInfiniteQuery,
  useGetMusicTracksQuery,
  useLazyGetMusicTracksQuery,
  useGetMusicTrackQuery,
  useLazyGetMusicTrackQuery,
  useGetMusicTrackWaveformQuery,
} = musicTracksApi
