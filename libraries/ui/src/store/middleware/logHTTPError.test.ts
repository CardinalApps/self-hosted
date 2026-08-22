import { describe, it, expect } from 'vitest'

import { shouldToastHTTPError } from './logHTTPError'
import { SERVICE_ACCESS_REQUIRED_CODE } from '../../lib/auth/serviceAccess'

const rejection = (payload: unknown) => ({
  type: 'api/executeMutation/rejected',
  payload,
  error: { message: 'Rejected' },
  meta: { rejectedWithValue: true, requestId: 'test', requestStatus: 'rejected' },
})

describe('shouldToastHTTPError', () => {
  it('toasts a server error', () => {
    expect(shouldToastHTTPError(rejection({ status: 500, data: { statusCode: 500, message: 'boom' } }))).toBe(true)
  })

  it('stays quiet when the server marks the answer Cardinal-Toast: none', () => {
    const action = rejection({ status: 503, data: { statusCode: 503, message: 'vanity_disabled' } }) as Record<string, unknown>
    action.meta = {
      ...(action.meta as Record<string, unknown>),
      baseQueryMeta: { response: { headers: new Headers({ 'Cardinal-Toast': 'none' }) } },
    }
    expect(shouldToastHTTPError(action)).toBe(false)
  })

  it('leaves 401s to the reauth base query', () => {
    expect(shouldToastHTTPError(rejection({ status: 401, data: { statusCode: 401, message: 'nope' } }))).toBe(false)
  })

  it('stays quiet for an access-gate refusal, which has its own presentation', () => {
    expect(shouldToastHTTPError(rejection({
      status: 403,
      data: { statusCode: 403, code: SERVICE_ACCESS_REQUIRED_CODE, message: 'Access required' },
    }))).toBe(false)

    expect(shouldToastHTTPError(rejection({
      status: 500,
      data: { statusCode: 500, message: `Could not enable Remote Access: ${SERVICE_ACCESS_REQUIRED_CODE}` },
    }))).toBe(false)
  })

  it('ignores actions that are not rejections carrying a value', () => {
    expect(shouldToastHTTPError({ type: 'api/executeMutation/fulfilled', payload: {}, meta: {} })).toBe(false)
  })
})
