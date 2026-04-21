import queryParams from '../../lib/net/queryParams'
import { baseHomeServerApi } from './baseHomeServerApi'

export type RunLogType = {
  id: number,
  createdAt: string,
  event: string,
  filePath: string | null,
  mediaType: string | null,
  diff: Record<string, { from: string | null, to: string | null }> | null,
  details: Record<string, unknown> | null,
}

export const runLogsApi = baseHomeServerApi
  .enhanceEndpoints({
    addTagTypes: ['RunLogs'],
  })
  .injectEndpoints({
    endpoints: (builder) => ({
      getRunLogs: builder.query<[RunLogType[], number], { runId: string, take: number, skip: number }>({
        query: ({ runId, take, skip }) => {
          return queryParams('/index/run/logs', { runId, take, skip })
        },
        providesTags: ['RunLogs'],
      }),
    }),
  })

export const { useGetRunLogsQuery } = runLogsApi
