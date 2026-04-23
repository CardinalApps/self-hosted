import { createAsyncThunk } from '@reduxjs/toolkit'

import { deleteJWT, JWT_TYPE } from '../../../../lib/auth/jwt'
import cloudUserLogout from '../../cloudUser/thunks/logout'
import homeServerAPI from '../../../../lib/homeserver/homeServerAPI'

import { STORE_KEY } from '../constants'
import { AppDispatch, RootState } from '../../..'

/**
 * This logs the home server user out. If it's an online account, the cloud
 * user will also be logged out.
 */
const homeServerLogout = createAsyncThunk<
  boolean,
  void,
  {
    dispatch: AppDispatch
    state: RootState
    rejectValue: { error: string }
  }
>(`${STORE_KEY}/logout`, async (data, thunkAPI) => {
  deleteJWT(JWT_TYPE.HOME_SERVER_USER)

  try {
    await homeServerAPI('/auth/logout', 'POST', { sendJWT: false, sendCloudUserJWT: false })
  } catch {
    // Best-effort: if the server is unreachable the refresh tolkien cookie will
    // expire naturally on its own
  }

  if (thunkAPI.getState().cloudUser.loggedIn) {
    thunkAPI.dispatch(cloudUserLogout())
  }

  return true
})

export default homeServerLogout
