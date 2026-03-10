import { queryParams } from '../../lib/net/queryParams'

import { baseHomeServerApi } from './baseHomeServerApi'

export const GET_JOB_TASKS_DEFAULT_OPTIONS = {
  take: 24,
  skip: 0,
  order: 'desc',
}

export const jobTasksApi = baseHomeServerApi
  .enhanceEndpoints({
    addTagTypes: ['JobTasks'],
  })
  .injectEndpoints({
    endpoints: (builder) => ({
      /**
      * Get a job task.
      */
      // getJobTask: builder.query({
      //   query: ({
      //     jobId,
      //     jobTaskId,
      //   }) => queryParams(`/jobs/${jobId}/tasks/${jobTaskId}`),
      // }),

      /**
       * Get all tasks for a job.
       */
      getJobTasks: builder.query({
        query: ({
          jobId,
          take = GET_JOB_TASKS_DEFAULT_OPTIONS.take,
          skip = GET_JOB_TASKS_DEFAULT_OPTIONS.skip,
          order = GET_JOB_TASKS_DEFAULT_OPTIONS.order,
        }) => queryParams(`/job/${jobId}/tasks`, {
          order,
          take,
          skip,
        }),
        providesTags: ['JobTasks'],
      }),
    }),
  })

export const {
  useGetJobTasksQuery,
  useLazyGetJobTasksQuery,
} = jobTasksApi
