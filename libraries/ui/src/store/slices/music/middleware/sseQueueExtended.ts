import { createListenerMiddleware } from '@reduxjs/toolkit'

import { playbackQueueApi } from '../../../apis/playbackQueues'

const sseQueueExtendedMiddleware = createListenerMiddleware()

/**
 * The server extends dynamic queues on its own as playback nears their end.
 * Refetch queue item lists so that every open queue UI shows the new tail.
 */
sseQueueExtendedMiddleware.startListening({
  predicate: (action) => {
    return action.type === 'sse/playback_queue.extended'
  },
  effect: async (action, listenerApi) => {
    listenerApi.dispatch(playbackQueueApi.util.invalidateTags(['PlaybackQueue.List']))
  },
})

export default sseQueueExtendedMiddleware
