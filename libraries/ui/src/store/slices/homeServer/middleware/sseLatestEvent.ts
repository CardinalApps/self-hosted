import { createListenerMiddleware } from '@reduxjs/toolkit'

import { homeServerActions } from '..'

const sseLatestEventMiddleware = createListenerMiddleware()

/**
 * Set the latest server side event in the store.
 */
sseLatestEventMiddleware.startListening({
  predicate: (action) => {
    return action.type.includes('sse/')
  },
  effect: async (action, listenerApi) => {
    listenerApi.dispatch(homeServerActions.setLatestEvent(action))
  },
})

export default sseLatestEventMiddleware
