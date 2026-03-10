import queryParams from '../../lib/net/queryParams'

import { baseHomeServerApi } from './baseHomeServerApi'

export type SeatLicensingType = {
  total: number,
  used: number,
}

export const licensingApi = baseHomeServerApi
  .enhanceEndpoints({
    addTagTypes: ['Licensing.Seats', 'Licensing.Subscription'],
  })
  .injectEndpoints({
    endpoints: (builder) => ({
      getLicensingSubscription: builder.query({
        query: () => {
          return queryParams('/licensing/subscription')
        },
        providesTags: ['Licensing.Subscription'],
      }),
      getLicensingSeats: builder.query({
        query: () => {
          return queryParams('/licensing/seats')
        },
        providesTags: ['Licensing.Seats'],
      }),
    }),
  })

export const {
  useGetLicensingSeatsQuery,
  useGetLicensingSubscriptionQuery,
} = licensingApi
