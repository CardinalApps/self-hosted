/**
 * @deprecated - Move to apis/users
 */
import queryParams from '../../lib/net/queryParams'

import { baseHomeServerApi } from './baseHomeServerApi'

export const activeUsersApi = baseHomeServerApi
  .enhanceEndpoints({
    addTagTypes: ['ActiveUsers'],
  })
  .injectEndpoints({
    endpoints: (builder) => ({
      getActiveUsers: builder.query({
        query: () => {
          return queryParams('/users/active')
        },
        providesTags: ['ActiveUsers'],
      }),
    }),
  })

export const {
  useGetActiveUsersQuery,
  useLazyGetActiveUsersQuery,
} = activeUsersApi
