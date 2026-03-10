import queryParams from '../../lib/net/queryParams'

import { CommonOrderParams, PaginationParams } from '../types/api'
import { baseHomeServerApi } from './baseHomeServerApi'

export type JobStatus = 'draft' | 'preparing' | 'in_queue' | 'running' | 'paused' | 'canceled' | 'completed' | 'errored'

// export type JobReport = {
//   type: string,
//   status: JobStatus,
// }

export type Job = {
  id: number,
  jobId: string,
  status: JobStatus,
  type: string,
  totalTasks: number,
  completedTasks: number,
  createdAt: Date,
  completedAt: Date,
}

export const jobsApi = baseHomeServerApi
  .enhanceEndpoints({
    addTagTypes: ['JobQueue', 'JobHistory', 'JobTypes'],
  })
  .injectEndpoints({
    endpoints: (builder) => ({
      getJobTypes: builder.query<
        string[],
        void
      >({
        query: () => {
          return queryParams('/jobs/types')
        },
        providesTags: ['JobTypes'],
      }),

      getJob: builder.query<
        Job,
        { id: string }
      >({
        query: ({ id }) => {
          return queryParams(`/job/${id}`)
        },
      }),

      getJobs: builder.query<
        [Job[], number],
        PaginationParams & {
          status: JobStatus[],
          type?: 'album_art_thumbnails' | 'photo_variations' | 'photo_thumbnails',
          order?: CommonOrderParams,
          orderBy?: 'name' | 'createdAt',
        }
      >({
        query: ({ take, skip, status, type, order, orderBy }) => {
          return queryParams('/jobs', {
            take,
            skip,
            ...(status && { status }),
            ...(type && { type }),
            ...(order && { order }),
            ...(orderBy && { orderBy }),
          })
        },
        providesTags: ['JobQueue', 'JobHistory'],
      }),

      startJob: builder.mutation<
        Job,
        Partial<Job>
      >({
        query: (body) => ({
          url: '/job',
          method: 'POST',
          body,
        }),
        invalidatesTags: ['JobQueue'],
      }),

      controlActiveJob: builder.mutation<
        Job,
        // FIXME server should accept a string
        { jobId: number, body: Partial<Job> }
      >({
        query: ({ jobId, body }) => ({
          url: `/job/${jobId}`,
          method: 'PATCH',
          body,
        }),
        invalidatesTags: ['JobQueue', 'JobHistory'],
      }),
    }),
  })

export const {
  useGetJobTypesQuery,
  useLazyGetJobTypesQuery,
  useGetJobQuery,
  useLazyGetJobQuery,
  useGetJobsQuery,
  useLazyGetJobsQuery,
  useStartJobMutation,
  useControlActiveJobMutation,
} = jobsApi
