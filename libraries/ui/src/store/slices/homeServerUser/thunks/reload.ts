import { createAsyncThunk } from '@reduxjs/toolkit'

import homeServerAPI from '../../../../lib/homeserver/homeServerAPI'
import { cloudUserActions } from '../../cloudUser'
import cloudUserLogout from '../../cloudUser/thunks/logout'

import homeServerUserLogout from './logout'

import { STORE_KEY } from '../constants'

/**
 * Reload/refresh the current user.
 */
const reloadUser = createAsyncThunk(`${STORE_KEY}/reload`, async (data, thunkAPI) => {
  let response

  try {
    response = await homeServerAPI('/users/current')
  } catch(error) {
    // Session was revoked via the auth app
    if (error?.statusCode == 405) {
      thunkAPI.dispatch(homeServerUserLogout())
      thunkAPI.dispatch(cloudUserLogout())
    }
    throw new Error(error)
  }

  const { localUser, cardinalUser } = response

  if (typeof localUser !== 'object' || !Object.keys(localUser).length) {
    throw new Error('Got invalid response')
  }

  if (typeof cardinalUser === 'object' && Object.keys(cardinalUser).length) {
    thunkAPI.dispatch(cloudUserActions.setUserData(cardinalUser))
  }

  return { localUser }
})

export default reloadUser
