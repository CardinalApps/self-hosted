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
>
export type MusicTrackType = {
  id: number,
  musicTrackId: string,
  title: string,
  trackNumber: number,
  discNumber: number,
  playCount: number,
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
          sort?: MusicTracksOrderBy,
          order?: CommonOrderParams,
          release?: boolean,
          metadata?: boolean,
          libraries?: string[],
        }
      >({
        query: ({ take, skip, release, metadata, sort, order, libraries }) => {
          return queryParams('/music/tracks', {
            ...(typeof skip !== 'undefined' && { skip }),
            ...(take && { take }),
            ...(sort && { sort }),
            ...(order && { order }),
            ...(release && { release }),
            ...(metadata && { metadata }),
            ...(libraries && { libraries }),
          })
        },
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
      }),
    }),
  })

export const {
  useGetInfiniteMusicTracksInfiniteQuery,
  useGetMusicTracksQuery,
  useLazyGetMusicTracksQuery,
  useGetMusicTrackQuery,
  useLazyGetMusicTrackQuery,
} = musicTracksApi
