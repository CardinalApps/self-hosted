import { createAsyncThunk } from '@reduxjs/toolkit'

import { setJWT, JWT_TYPE } from '../../../../lib/auth/jwt'
import homeServerAPI from '../../../../lib/homeserver/homeServerAPI'

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
>(`${STORE_KEY}/refreshToken`, async (): Promise<string> => {
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
