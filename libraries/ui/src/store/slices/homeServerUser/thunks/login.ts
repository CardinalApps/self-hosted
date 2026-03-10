import { createAsyncThunk } from '@reduxjs/toolkit'

import { setJWT, JWT_TYPE } from '../../../../lib/auth/jwt'
import { cloudUserActions } from '../../cloudUser'
import { toastActions } from '../../toast'
import homeServerAPI, { CARDINAL_APP_HEADER } from '../../../../lib/homeserver/homeServerAPI'

import { STORE_KEY } from '../constants'

import i18n from '../i18n'
import { AppDispatch, RootState } from '../../../'

export type HomeServerLoginArgs = {
  userId?: string,
  username?: string,
  password?: string,
  cardinalSSOToken?: string,
  redirectOutOfNextLoginPageVisit?: boolean
}

export type HomeServerLoginResponse = {
  user: Record<string, unknown>,
  homeServerJWT?: string,
  cloudUser?: Record<string, unknown>,
  cloudJWT?: string,
  redirectOutOfNextLoginPageVisit?: boolean,
}

/**
 * Using the local JWT, this will fetch the user's data from the home server.
 * Depending on the server response, this thunk will do one of the following:
 *
 * 1. 200 - We know the user is valid, and the returned user data will be
 *    saved in the store.
 *
 * 4. 5xx - Server error. The store state will be set to "error", but the
 *    current user will not be logged out.
 */
const homeServerLogin = createAsyncThunk<
  HomeServerLoginResponse,
  HomeServerLoginArgs,
  {
    dispatch: AppDispatch
    state: RootState
    rejectValue: { error: string }
  }
>(`${STORE_KEY}/login`, async (args, thunkAPI): Promise<HomeServerLoginResponse> => {
  const {
    userId,
    username,
    password,
    cardinalSSOToken,
    redirectOutOfNextLoginPageVisit = true,
  } = args

  let user
  let homeServerJWT
  let cloudUser
  let cloudUserJWT
  const store = thunkAPI.getState()

  try {
    const loginResponse = await homeServerAPI(`/login`, 'POST', {
      headers: {
        [CARDINAL_APP_HEADER]: store?.app?.app,
      },
      body: {
        userId,
        username,
        password,
        cardinalJWT: cardinalSSOToken,
      },
    }) as { user, JWT, cloudUser, cloudJWT }
    user = loginResponse?.user
    homeServerJWT = loginResponse?.JWT
    cloudUser = loginResponse?.cloudUser
    cloudUserJWT = loginResponse?.cloudJWT
  } catch(error) {
    console.error(error)
    const lang = thunkAPI.getState()?.settings?.current?.lang || 'en'
    thunkAPI.dispatch(toastActions.addToQueue({
      type: 'danger',
      title: i18n['login.error.title'][lang],
      body: i18n['login.error.body'][lang].replace('{error}', error?.message),
    }))
    throw new Error(error)
  }

  if (!homeServerJWT) {
    throw new Error()
  }

  setJWT(homeServerJWT, JWT_TYPE.HOME_SERVER_USER)

  if (cloudUser) {
    thunkAPI.dispatch(cloudUserActions.setUserData(cloudUser))
    thunkAPI.dispatch(cloudUserActions.setLoggedIn(true))
    setJWT(cloudUserJWT, JWT_TYPE.CLOUD_USER)
  }

  return {
    homeServerJWT,
    user,
    redirectOutOfNextLoginPageVisit: redirectOutOfNextLoginPageVisit,
  }
})

export default homeServerLogin
