import queryParams from '../../lib/net/queryParams'
import { UserType } from '../../types/user'

import { CommonOrderParams, PaginationParams } from '../types/api'
import { baseHomeServerApi } from './baseHomeServerApi'
import { QueueItem, ServerQueue } from '../slices/music'

export type QueueType = 'static' | 'dynamic'
export type DynamicQueueType = 'true_shuffle' | 'house_mix' | 'encore' | 'the_depths'
export type QueueSeedMediaType = 'music_release' | 'music_artist'

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

      // The server works out the item's new position from the item it was dropped
      // behind, so a stale queue on this end cannot land a track in the wrong place
      moveQueueItem: builder.mutation<
        QueueItem[],
        {
          queueId: string,
          queueItemId: string,
          afterQueueItemId: string,
        }
      >({
        query: ({ queueId, queueItemId, afterQueueItemId }) => ({
          url: `/playback-queues/${queueId}/items/${queueItemId}`,
          method: 'PATCH',
          body: { afterQueueItemId },
        }),
        invalidatesTags: ['PlaybackQueue.List'],
      }),

      /*
        Adds tracks to an existing queue, either right after the current item ('next') or at
        the end ('end'). The server's /extend endpoint is still a stub, so for now this call
        succeeds without changing the queue — the client contract is settled here so the
        server work can land independently.
      */
      extendQueue: builder.mutation<
        void,
        {
          queueId: string,
          trackIds: string[],
          insert: 'next' | 'end',
        }
      >({
        query: ({ queueId, trackIds, insert }) => ({
          url: `/playback-queues/${queueId}/extend`,
          method: 'POST',
          body: {
            insert,
            items: trackIds.map((trackId) => ({ mediaId: trackId, mediaType: 'music_track' })),
          },
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
  useMoveQueueItemMutation,
  useExtendQueueMutation,
} = playbackQueueApi
