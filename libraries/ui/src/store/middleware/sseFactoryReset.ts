import { createListenerMiddleware } from '@reduxjs/toolkit'

import { globalActions, sseActions } from '../constants/actions'

const sseFactoryResetMiddleware = createListenerMiddleware()

/**
 * The factory reset event is triggered server side. When it happens, intercept
 * it and dispatch the client side reset.
 */
sseFactoryResetMiddleware.startListening({
  predicate: (action) => {
    return action.type === sseActions.FACTORY_RESET
  },
  effect: async (action, listenerApi) => {
    listenerApi.dispatch({ type: globalActions.RESET })
  },
})

export default sseFactoryResetMiddleware
