import { describe, it, expect, vi, beforeEach } from 'vitest'

import handle401, { fullLogout } from './handle401'
import { CLOUD_TOKEN_REQUIRED_CODE } from '../../../../lib/auth/cloudSession'
import {
  CLOUD_USER_JWT_LOCALSTORAGE_KEY,
  HOME_SERVER_USER_JWT_LOCALSTORAGE_KEY,
  setJWT,
  JWT_TYPE,
} from '../../../../lib/auth/jwt'
import { globalActions } from '../../../../store/constants/actions'

const REFRESH_ENDPOINT = '/auth/refresh'

// Builds the Media Server's answer to a request it turned down
const errorResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

const signedIntoBoth = () => {
  setJWT('local-token', JWT_TYPE.HOME_SERVER_USER)
  setJWT('cloud-token', JWT_TYPE.CLOUD_USER)
}

const storedLocalToken = () => localStorage.getItem(HOME_SERVER_USER_JWT_LOCALSTORAGE_KEY)
const storedCloudToken = () => localStorage.getItem(CLOUD_USER_JWT_LOCALSTORAGE_KEY)

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

describe('handle401', () => {
  /* For a cloud-linked account the Cardinal account is the identity, so a cloud credential the
     server refuses ends the session outright — both halves, not just the cloud one. */
  it('ends both sessions when the server refuses the cloud credential', async () => {
    signedIntoBoth()
    const dispatch = vi.fn()

    await handle401(
      errorResponse(401, { code: CLOUD_TOKEN_REQUIRED_CODE, message: 'Cloud token required.' }),
      REFRESH_ENDPOINT,
      'POST',
      {},
      dispatch,
      'en',
    )

    expect(storedCloudToken()).toBeNull()
    expect(storedLocalToken()).toBeNull()
    expect(dispatch).toHaveBeenCalledWith({ type: 'cloudUser/logout/fulfilled' })
    expect(dispatch).toHaveBeenCalledWith({ type: globalActions.RESET })
  })

  it('resets the persisted store on a cloud refusal from any endpoint', async () => {
    signedIntoBoth()
    const dispatch = vi.fn()

    await handle401(
      errorResponse(401, { code: CLOUD_TOKEN_REQUIRED_CODE, message: 'Cloud token required.' }),
      '/remote-access/status',
      'GET',
      {},
      dispatch,
      'en',
    )

    expect(dispatch.mock.calls.map(([action]) => action.type)).toContain(globalActions.RESET)
  })

  // The caller reads the same response after the middleware runs, so the body has to survive
  it('leaves the response body readable for the caller', async () => {
    const response = errorResponse(401, { code: CLOUD_TOKEN_REQUIRED_CODE, message: 'Cloud token required.' })

    await handle401(response, REFRESH_ENDPOINT, 'POST', {}, vi.fn(), 'en')

    await expect(response.json()).resolves.toMatchObject({ code: CLOUD_TOKEN_REQUIRED_CODE })
  })

  it('still tears down the local session when a refresh fails for any other reason', async () => {
    signedIntoBoth()
    const dispatch = vi.fn()

    await handle401(
      errorResponse(401, { message: 'Invalid or expired refresh token' }),
      REFRESH_ENDPOINT,
      'POST',
      {},
      dispatch,
      'en',
    )

    expect(storedLocalToken()).toBeNull()
    expect(dispatch).toHaveBeenCalledWith({ type: globalActions.RESET })
  })

  it('ignores anything that is not a 401', async () => {
    signedIntoBoth()
    const dispatch = vi.fn()

    await handle401(
      errorResponse(503, { code: 'cloud_unavailable', message: 'The Cardinal cloud could not be reached.' }),
      REFRESH_ENDPOINT,
      'POST',
      {},
      dispatch,
      'en',
    )

    expect(storedLocalToken()).toBe('local-token')
    expect(storedCloudToken()).toBe('cloud-token')
    expect(dispatch).not.toHaveBeenCalled()
  })
})

describe('fullLogout', () => {
  /* The reverse conflation: signing out of one Media Server used to sign the browser out of the
     Cardinal account it uses for every other server and app too. */
  it('ends the local session without touching the cloud identity', () => {
    signedIntoBoth()
    const dispatch = vi.fn()

    fullLogout(dispatch, 'en', null)

    expect(storedLocalToken()).toBeNull()
    expect(storedCloudToken()).toBe('cloud-token')
    expect(dispatch).toHaveBeenCalledWith({ type: globalActions.RESET })
  })
})
