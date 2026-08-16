import { createListenerMiddleware, isRejectedWithValue } from '@reduxjs/toolkit'
import type { UnknownAction } from '@reduxjs/toolkit'
import { toastActions } from '../slices/toast'
import { isServiceAccessRefusal } from '../../lib/auth/serviceAccess'

const logHTTPErrorMiddleware = createListenerMiddleware()

type ApiErrorPayload = {
  data: {
    message: string,
    statusCode: number,
  }
}

// Which API failures are worth a toast of their own
export const shouldToastHTTPError = (action: unknown): boolean => {
  if (!isRejectedWithValue(action as UnknownAction)) return false

  const payload = (action as { payload?: unknown }).payload

  // 401s are handled by the reauth base query; no toast needed
  if ((payload as ApiErrorPayload)?.data?.statusCode === 401) return false

  /* A cloud service access refusal is not a fault: the request has already been queued, and the
     card that made the call says so in place of an error. */
  return !isServiceAccessRefusal(payload)
}

/**
 * Automatically dispatches toasts with error messages from the API.
 */
logHTTPErrorMiddleware.startListening({
  predicate: (action) => shouldToastHTTPError(action),
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
