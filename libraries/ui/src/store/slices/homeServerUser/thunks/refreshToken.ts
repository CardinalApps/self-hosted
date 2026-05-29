import { createAsyncThunk } from '@reduxjs/toolkit'

import { setJWT, getJWT, JWT_TYPE, isJwtExpiringSoon } from '../../../../lib/auth/jwt'
import homeServerAPI from '../../../../lib/homeserver/homeServerAPI'
import refreshCloudToken from '../../cloudUser/thunks/refreshToken'

import { STORE_KEY } from '../constants'
import { AppDispatch, RootState } from '../../../'

const refreshToken = createAsyncThunk<
  string,
  void,
  {
    dispatch: AppDispatch
    state: RootState
    rejectValue: { error: string }
  }
>(`${STORE_KEY}/refreshToken`, async (_, { dispatch }): Promise<string> => {
  // Cloud-linked accounts: the Media Server re-validates the cloud access token
  // on every refresh, so make sure it's fresh before we ask. Local accounts
  // have no cloud token and skip this.
  const cloudJWT = getJWT(JWT_TYPE.CLOUD_USER)
  if (cloudJWT && isJwtExpiringSoon(cloudJWT, 30)) {
    try {
      await dispatch(refreshCloudToken()).unwrap()
    } catch {
      // If the cloud refresh fails (e.g. its own refresh cookie has expired),
      // proceed and let the Media Server reject, triggering a full logout.
    }
  }

  const response = await homeServerAPI<{ JWT: string, scope: 'local' | 'session' | 'memory' }>('/auth/refresh', 'POST', {
    sendJWT: false,
    sendCloudUserJWT: true,
  })

  const { JWT: jwt, scope = 'local' } = response as { JWT: string, scope: 'local' | 'session' | 'memory' }

  if (!jwt) {
    throw new Error('Refresh response missing JWT')
  }

  setJWT(jwt, JWT_TYPE.HOME_SERVER_USER, scope)
  return jwt
})

export default refreshToken
