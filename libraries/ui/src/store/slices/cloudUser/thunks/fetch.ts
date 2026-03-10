import { createAsyncThunk } from '@reduxjs/toolkit'

import { deleteJwt } from '../../../../lib/auth/jwt'

import { STORE_KEY } from '../constants'
import { AppDispatch, RootState } from '../../..'
import { CloudUser } from '..'
import authAPI from '../../../../lib/auth/authAPI'

export type FetchCloudUserSuccess = {
  status: string | number | boolean,
  user?: Partial<CloudUser>,
}

export type FetchCloudUserArg = {
  url: string | null,
  piiUrl: string | null,
}

/**
 * Using the local JWT, this will fetch the user's data from the auth servers.
 * Depending on the server response, this thunk will do one of the following:
 *
 * 1. 200 - We know the session is valid, and the returned user data will be
 *    saved in the store.
 *
 * 2. 401 - The server says the session is not valid. The current user will be
 *    logged out and the local JWT will be deleted.
 *
 * 3. 410 - The server says that the account was deleted. The current user will
 *    be logged out and the local JWT will be deleted.
 *
 * 4. 5xx - Server error. The store state will be set to "error", but the
 *    current user will not be logged out.
 */
const fetchCloudUser = createAsyncThunk<
  FetchCloudUserSuccess,
  FetchCloudUserArg | void,
  {
    dispatch: AppDispatch
    state: RootState
  }
>(`${STORE_KEY}/fetchUser`, async (options?) => {
  if (!options) {
     options = { url: null, piiUrl: null }
  }

  let responses

  // Try to get the user's public and private data
  try {
    responses = await Promise.all([
      authAPI('/user', 'GET', { returnRawResponse: true }),
      authAPI('/user/pii', 'GET', { returnRawResponse: true }),
    ])
  } catch (error) {
    console.warn('No response from backend.')
    return { status: '5xx' }
  }

  if (!responses) {
    return { status: '5xx' }
  }

  // If one or both of the requests returns a 401, then the local JWT is no
  // longer valid.
  const successfulResponses = []

  for (const response of responses) {
    if (response.ok) {
      successfulResponses.push(response)
    } else {
      // Only the first failed promise status code will be captured here, but
      // that's probably ok
      if (response.status === 401 || response.status === 410) {
        deleteJwt()
      }
      return { status: response.status }
    }
  }

  if (successfulResponses.length !== responses.length) {
    console.warn('This error should not happen. It is here as a fail safe.')
    return { status: '5xx' }
  }

  let user = { pii: {} }

  // Make the user object
  for (const response of successfulResponses) {
    const data = await response.json()

    if ('email' in data) {
      user.pii = { ...data }
    } else {
      user = { ...user, ...data }
    }
  }

  return {
    user,
    status: 200,
  }
})

export default fetchCloudUser
