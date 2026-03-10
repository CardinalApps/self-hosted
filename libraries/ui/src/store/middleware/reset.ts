import { createListenerMiddleware } from '@reduxjs/toolkit'

import { globalActions } from '../constants/actions'

import { deleteAllJWTs } from '../../lib/auth/jwt'

const resetMiddleware = createListenerMiddleware()

/**
 * Sends the reset action to all reducers.
 */
resetMiddleware.startListening({
  predicate: (action) => {
    return action.type === globalActions.RESET
  },
  effect: async () => {
    deleteAllJWTs()
  },
})

export default resetMiddleware
