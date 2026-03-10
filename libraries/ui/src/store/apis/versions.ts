import queryParams from '../../lib/net/queryParams'

import { baseHomeServerApi } from './baseHomeServerApi'

export const versionsApi = baseHomeServerApi
  .enhanceEndpoints({
    addTagTypes: ['Versions', 'ReleaseChannels', 'Updates'],
  })
  .injectEndpoints({
    endpoints: (builder) => ({
      getVersions: builder.query({
        query: () => {
          return queryParams('/versions')
        },
        providesTags: ['Versions'],
      }),
      getReleaseChannel: builder.query({
        query: () => {
          return queryParams('/release-channels')
        },
        providesTags: ['ReleaseChannels'],
      }),
      getUpdates: builder.query({
        query: () => {
          return queryParams('/updates')
        },
        providesTags: ['Updates'],
      }),
    }),
  })


export const {
  useGetVersionsQuery,
  useLazyGetVersionsQuery,
  useGetReleaseChannelQuery,
  useLazyGetReleaseChannelQuery,
  useGetUpdatesQuery,
  useLazyGetUpdatesQuery,
} = versionsApi
