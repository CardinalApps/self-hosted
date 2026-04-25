import { createListenerMiddleware, isRejectedWithValue } from '@reduxjs/toolkit'
import { toastActions } from '../slices/toast'

const logHTTPErrorMiddleware = createListenerMiddleware()

type ApiErrorPayload = {
  data: {
    message: string,
    statusCode: number,
  }
}

/**
 * Automatically dispatches toasts with error messages from the API.
 */
logHTTPErrorMiddleware.startListening({
  predicate: (action) => {
    if (!isRejectedWithValue(action)) return false
    const statusCode = (action.payload as ApiErrorPayload)?.data?.statusCode
    // 401s are handled by the token refresh middleware; no toast needed
    return statusCode !== 401
  },
  effect: async (action, store) => {
    const error = action.payload as ApiErrorPayload

    // @ts-expect-error
    const queryMeta = action?.meta?.baseQueryMeta
    const u = new URL(queryMeta?.request?.url)

    const title = error?.data?.message
      ? `${error?.data?.statusCode} - ${error?.data?.message}`
      : 'Network Error'

    const body = queryMeta
      ? `<code>${queryMeta?.request?.method} ${u.pathname}</code>`
      : undefined

    store.dispatch(toastActions.addToQueue({
      type: 'danger',
      title: title,
      body: body,
      ttl: 8000,
    }))
  },
})

export default logHTTPErrorMiddleware
