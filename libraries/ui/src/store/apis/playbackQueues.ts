import { DynamicQueueType, QueueType } from '@cardinalapps/types/src/playback-queue'

import queryParams from '../../lib/net/queryParams'
import { UserType } from '../../types/user'

import { CommonOrderParams, PaginationParams } from '../types/api'
import { baseHomeServerApi } from './baseHomeServerApi'
import { QueueItem, ServerQueue } from '../slices/music'

/**
 * @deprecated
 */
export type QueueT = {
  createdAt?: string,
  user: UserType,
  type: QueueType,
  dynamicName?: DynamicQueueType,
}

export const playbackQueueApi = baseHomeServerApi
  .enhanceEndpoints({
    addTagTypes: ['PlaybackQueue.List'],
  })
  .injectEndpoints({
    endpoints: (builder) => ({
      getQueue: builder.query<
        ServerQueue,
        {
          queueId: string,
        }
      >({
        query: ({
          queueId,
        }) => queryParams(`/playback-queues/${queueId}`, {
        }),
      }),

      getQueues: builder.query<
        [QueueT[], number],
        PaginationParams & {
          order?: CommonOrderParams,
          orderBy?: 'createdAt',
          type?: QueueType,
        }
      >({
        query: ({ take, skip, order, orderBy, type }) => {
          return queryParams('/playback-queues', {
            ...(take && { take }),
            ...(skip && { skip }),
            ...(order && { order }),
            ...(orderBy && { orderBy }),
            ...(type && { type }),
          })
        },
        providesTags: ['PlaybackQueue.List'],
      }),

      getQueueItems: builder.query<
        [QueueItem[], number],
        PaginationParams & {
          queueId: string,
          leading?: number,
          trailing?: number,
          currentQueueItemId?: string,
          includeCurrentItemInReturn?: boolean,
        }
      >({
        query: ({
          leading,
          trailing,
          queueId,
          currentQueueItemId,
          includeCurrentItemInReturn,
        }) => {
          return queryParams(`/playback-queues/${queueId}/items`, {
            ...(leading && { leading }),
            ...(trailing && { trailing }),
            ...(currentQueueItemId && { currentQueueItemId }),
            ...(typeof includeCurrentItemInReturn === 'boolean' && { includeCurrentItemInReturn }),
          })
        },
        providesTags: ['PlaybackQueue.List'],
      }),

      createQueue: builder.mutation<
        QueueT,
        Partial<QueueT>
      >({
        query: (body) => ({
          url: '/playback-queues',
          method: 'POST',
          body,
        }),
        invalidatesTags: ['PlaybackQueue.List'],
      }),

      deleteQueue: builder.mutation<
        boolean,
        string
      >({
        query: (id) => ({
          url: `/playback-queues/${id}`,
          method: 'DELETE',
        }),
        invalidatesTags: ['PlaybackQueue.List'],
      }),
    }),
  })

export const {
  useGetQueuesQuery,
  useGetQueueItemsQuery,
  useCreateQueueMutation,
  useDeleteQueueMutation,
} = playbackQueueApi
