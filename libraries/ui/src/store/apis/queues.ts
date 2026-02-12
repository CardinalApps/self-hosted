import queryParams from '../../lib/net/queryParams'
import { UserType } from '../../types/user'

import { CommonOrderParams, PaginationParams } from '../types/api'
import { baseHomeServerApi } from './baseHomeServerApi'

type QueueTypeType = 'static' | 'dynamic'
export type DynamicQueueName = 'true_shuffle'

export type QueueType = {
  createdAt?: string,
  user: UserType,
  type: QueueTypeType,
  dynamicName?: string,
}

export const queueApi = baseHomeServerApi
  .enhanceEndpoints({
    addTagTypes: ['Queue.List'],
  })
  .injectEndpoints({
    endpoints: (builder) => ({
      getQueues: builder.query<
        [QueueType[], number],
        PaginationParams & {
          order?: CommonOrderParams,
          orderBy?: 'createdAt',
          type?: QueueTypeType,
        }
      >({
        query: ({ take, skip, order, orderBy, type }) => {
          return queryParams('/queue', {
            ...(take && { take }),
            ...(skip && { skip }),
            ...(order && { order }),
            ...(orderBy && { orderBy }),
            ...(type && { type }),
          })
        },
        providesTags: ['Queue.List'],
      }),

      createQueue: builder.mutation<
        QueueType,
        Partial<QueueType>
      >({
        query: (body) => ({
          url: '/queue',
          method: 'POST',
          body,
        }),
        invalidatesTags: ['Queue.List'],
      }),

      deleteQueue: builder.mutation<
        boolean,
        string
      >({
        query: (id) => ({
          url: `queue/${id}`,
          method: 'DELETE',
        }),
        invalidatesTags: ['Queue.List'],
      }),
    }),
  })

export const {
  useGetQueuesQuery,
  useCreateQueueMutation,
  useDeleteQueueMutation,
} = queueApi
