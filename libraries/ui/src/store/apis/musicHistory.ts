import queryParams from '../../lib/net/queryParams'
import { CommonOrderParams, PaginationParams } from '../types/api'
import { UserType } from '../../types/user'
import { getNextPageParam, getPreviousPageParam, ITEMS_PER_RTK_PAGE } from '../utils/infiniteScroll'
import { baseHomeServerApi } from './baseHomeServerApi'
import { MusicTrackType } from './musicTracks'

export type MusicHistoryEntryType = {
  createdAt: string,
  updatedAt: string,
  id: number,
  progress: number,
  playbackEntryId: string,
  track: MusicTrackType,
  user: UserType,
  [key: string]: unknown,
}
export type UpsertMusicHistoryEntryType = {
  queueEntryId: string,
  seconds: number,
}

export const musicHistoryApi = baseHomeServerApi
  .enhanceEndpoints({
    addTagTypes: ['MusicHistoryList', 'MusicTracks'],
  })
  .injectEndpoints({
    endpoints: (builder) => ({
      // One plain page of history, newest first, for consumers that only need to peek at
      // recent listens (e.g. finding the last played track of a release) without the
      // infinite scroll machinery.
      getMusicHistory: builder.query<
        [MusicHistoryEntryType[], number],
        PaginationParams & {
          order?: CommonOrderParams,
          release?: boolean,
          metadata?: boolean,
        }
      >({
        query: ({ take, skip, order, release, metadata }) => {
          return queryParams('/music/history', {
            ...(take && { take }),
            ...(typeof skip !== 'undefined' && { skip }),
            ...(order && { order }),
            ...(release && { release }),
            ...(metadata && { metadata }),
          })
        },
        providesTags: ['MusicHistoryList'],
      }),

      /**
       * Infinite scroll.
       */
      getInfiniteMusicHistory: builder.infiniteQuery<
        [MusicHistoryEntryType[], number],
        {
          order?: CommonOrderParams,
          release?: boolean,
          metadata?: boolean
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
          const { release, metadata, order } = queryArg
          const { take, skip } = pageParam
          return queryParams('/music/history', {
            ...(typeof skip !== 'undefined' && { skip }),
            ...(take && { take }),
            ...(order && { order }),
            ...(release && { release }),
            ...(metadata && { metadata }),
          })
        },
        providesTags: ['MusicHistoryList'],
      }),

      /**
       * Mutations.
       */
      upsertHistoryEntry: builder.mutation<
        UpsertMusicHistoryEntryType,
        Partial<MusicHistoryEntryType>
      >({
        query: (body) => ({
          url: '/music/history',
          method: 'PATCH',
          body,
        }),
        invalidatesTags: ['MusicHistoryList', 'MusicTracks'],
      }),
    }),
  })

export const {
  useGetMusicHistoryQuery,
  useUpsertHistoryEntryMutation,
  useGetInfiniteMusicHistoryInfiniteQuery,
} = musicHistoryApi
