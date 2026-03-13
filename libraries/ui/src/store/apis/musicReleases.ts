import queryParams from '../../lib/net/queryParams'

import { CommonOrderParams, CommonSortParams, PaginationParams } from '../types/api'
import { getNextPageParam, getPreviousPageParam, ITEMS_PER_RTK_PAGE } from '../utils/infiniteScroll'
import { baseHomeServerApi } from './baseHomeServerApi'
//import { Library } from './libraries'

export type ReleasesSortParams = CommonSortParams | 'sortTitle' | 'trackNumber'
export type MusicReleaseType = {
  id: number,
  title: string,
  tracks: Array<{
    id: number,
    trackNumber: number,
    [key: string]: unknown,
  }>,
  artist: {
    id: number,
    name: string,
    musicArtistId: string,
    [key: string]: unknown,
  },
  artists: Array<{
    id: number,
    [key: string]: unknown,
  }>,
  genres: Array<{
    id: string,
    name: string,
  }>,
  thumbnails: Array<{
    size: string,
    relativeSrc: string,
    thumbnailId: string,
    id: number,
  }>,
  [key: string]: unknown,
}

export const musicReleasesApi = baseHomeServerApi
  .enhanceEndpoints({
    addTagTypes: ['list', 'MusicRelease'],
  })
  .injectEndpoints({
    endpoints: (builder) => ({
      /**
       * Infinite scroll.
       */
      getInfiniteMusicReleases: builder.infiniteQuery<
        [MusicReleaseType[], number],
        {
          sort?: ReleasesSortParams,
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
          const { sort, order, libraries } = queryArg
          const { take, skip } = pageParam
          return queryParams('/music/releases', {
            ...(typeof skip !== 'undefined' && { skip }),
            ...(take && { take }),
            ...(sort && { sort }),
            ...(order && { order }),
            ...(libraries && { libraries }),
            thumbnails: true,
            metadata: true,
            tracks: true,
          })
        },
      }),

      /**
       * Queries.
       */
      getMusicReleases: builder.query<
        [MusicReleaseType[], number],
        PaginationParams & {
          tracks?: boolean,
          genres?: boolean,
          artists?: boolean,
          thumbnails?: boolean,
          order?: CommonOrderParams,
          orderBy?: 'name' | 'createdAt',
          libraries?: string[],
        }
      >({
        query: ({ take, skip, order, orderBy, tracks, genres, artists, thumbnails, libraries }) => {
          return queryParams('/music/releases', {
            ...(take && { take }),
            ...(skip && { skip }),
            ...(order && { order }),
            ...(orderBy && { orderBy }),
            ...(tracks && { tracks }),
            ...(genres && { genres }),
            ...(artists && { artists }),
            ...(thumbnails && { thumbnails }),
            ...(libraries && { libraries }),
          })
        },
      }),

      /**
       * Get one.
       */
      getMusicRelease: builder.query<
        MusicReleaseType,
        { id: string }
      >({
        query: ({ id }) => {
          return queryParams(`/music/release/${id}`, {
            tracks: true,
            genres: true,
            artists: true,
            thumbnails: true,
          })
        },
      }),
    }),
  })

export const {
  useGetInfiniteMusicReleasesInfiniteQuery,
  useGetMusicReleaseQuery,
  useGetMusicReleasesQuery,
  useLazyGetMusicReleaseQuery,
  useLazyGetMusicReleasesQuery,
} = musicReleasesApi
