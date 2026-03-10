import queryParams from '../../lib/net/queryParams'
import { CommonSortParams, CommonOrderParams, PaginationParams } from '../types/api'
import { UserType } from '../../types/user'
import { getNextPageParam, getPreviousPageParam, ITEMS_PER_RTK_PAGE } from '../utils/infiniteScroll'
import { baseHomeServerApi } from './baseHomeServerApi'
import { MusicTrackType } from './musicTracks'

export type MusicHistorySortParams = CommonSortParams | 'sortTitle' | 'trackNumber'
export type MusicHistoryEntryType = {
  createdAt: string,
  id: number,
  progress: number,
  playbackEntryId: string,
  track: MusicTrackType,
  user: UserType,
  [key: string]: unknown,
}

export const musicHistoryApi = baseHomeServerApi
  .enhanceEndpoints({
    addTagTypes: ['MusicHistoryList'],
  })
  .injectEndpoints({
    endpoints: (builder) => ({
      /**
       * Infinite scroll.
       */
      getInfiniteMusicHistory: builder.infiniteQuery<
        [MusicHistoryEntryType[], number],
        {
          sort?: MusicHistorySortParams,
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
          const { release, metadata, sort, order } = queryArg
          const { take, skip } = pageParam
          return queryParams('/music/history', {
            ...(typeof skip !== 'undefined' && { skip }),
            ...(take && { take }),
            ...(sort && { sort }),
            ...(order && { order }),
            ...(release && { release }),
            ...(metadata && { metadata }),
          })
        },
      }),
    }),
  })

export const {
  useGetInfiniteMusicHistoryInfiniteQuery,
} = musicHistoryApi
