import queryParams from '../../lib/net/queryParams'
import { baseHomeServerApi } from './baseHomeServerApi'

import { getNextPageParam, getPreviousPageParam, ITEMS_PER_RTK_PAGE } from '../utils/infiniteScroll'
import { CommonOrderParams, PaginationParams } from '../types/api'
import { ToolbarOrderByType } from '../../components/interaction/Toolbar/types'

export type MusicAritstsOrderBy = Extract<ToolbarOrderByType,
  'createdAt'
  | 'name'
>
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
