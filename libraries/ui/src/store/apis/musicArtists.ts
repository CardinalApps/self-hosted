import queryParams from '../../lib/net/queryParams'
import { baseHomeServerApi } from './baseHomeServerApi'

import { getNextPageParam, getPreviousPageParam, ITEMS_PER_RTK_PAGE } from '../utils/infiniteScroll'
import { CommonOrderParams, CommonSortParams, PaginationParams } from '../types/api'

export type ArtistsSortParams = CommonSortParams | 'sortName'
export type MusicArtistType = {
  id: number,
  name: string,
  releases: Record<string, unknown>[],
  tracks: Record<string, unknown>[],
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
          sort?: ArtistsSortParams,
          order?: CommonOrderParams,
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
          const { sort, order } = queryArg
          const { take, skip } = pageParam
          return queryParams('/music/artists', {
            ...(typeof skip !== 'undefined' && { skip }),
            ...(take && { take }),
            ...(sort && { sort }),
            ...(order && { order }),
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
      getMusicArtist: builder.query<
        MusicArtistType,
        { id: string }
      >({
        query: ({ id }) => {
          return queryParams(`/music/artist/${id}`)
        },
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
