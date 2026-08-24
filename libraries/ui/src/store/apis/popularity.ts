import queryParams from '../../lib/net/queryParams'

import { baseHomeServerApi } from './baseHomeServerApi'

export const popularityApi = baseHomeServerApi
  .enhanceEndpoints({
    addTagTypes: ['PopularityStats'],
  })
  .injectEndpoints({
    endpoints: (builder) => ({
      getPopularityStats: builder.query<{ playsContributed: number }, void>({
        query: () => {
          return queryParams('/popularity/stats')
        },
        providesTags: ['PopularityStats'],
      }),
    }),
  })

export const {
  useGetPopularityStatsQuery,
} = popularityApi
