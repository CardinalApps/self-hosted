import queryParams from '../../lib/net/queryParams'

import { baseHomeServerApi } from './baseHomeServerApi'

export const instanceApi = baseHomeServerApi
  .enhanceEndpoints({
    addTagTypes: ['Instance'],
  })
  .injectEndpoints({
    endpoints: (builder) => ({
      getInstance: builder.query<
        {
          instanceId: string,
          serverName: string,
        },
        void
      >({
        query: () => {
          return queryParams('/instance')
        },
        providesTags: ['Instance'],
      }),
    }),
  })


export const {
  useGetInstanceQuery,
} = instanceApi
