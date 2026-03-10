import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react"
import { HOME_SERVER_HOST } from "../../../env"
import { prepareRTKQueryHeaders } from "../../lib/homeserver/prepareRTKQueryHeaders"

export const baseHomeServerApi = createApi({
  reducerPath: 'api',
  refetchOnMountOrArgChange: true,
  baseQuery: fetchBaseQuery({
    baseUrl: `${HOME_SERVER_HOST}/api/v1`,
    prepareHeaders: prepareRTKQueryHeaders,
  }),
  endpoints: () => ({}),
})
