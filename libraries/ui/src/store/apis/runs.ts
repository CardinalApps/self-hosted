import queryParams from '../../lib/net/queryParams'

import { baseHomeServerApi } from './baseHomeServerApi'

export const runsApi = baseHomeServerApi
  .enhanceEndpoints({
    addTagTypes: ['Runs'],
  })
  .injectEndpoints({
    endpoints: (builder) => ({
      getRuns: builder.query({
        query: ({ take, skip, includeEmptyRuns }) => {
          return queryParams('/index/runs', {
            includeEmptyRuns,
            take,
            skip,
          })
        },
        providesTags: ['Runs'],
      }),
      createRun: builder.mutation({
        query: (body) => ({
          url: '/index/run',
          method: 'POST',
          body,
        }),
      }),
      updateCurrentRunState: builder.mutation({
        query: (body) => ({
          url: '/index/state',
          method: 'PATCH',
          body,
        }),
      }),
    }),
  })

export const {
  useGetRunsQuery,
  useCreateRunMutation,
  useUpdateCurrentRunStateMutation,
} = runsApi
