import { createAsyncThunk } from '@reduxjs/toolkit'

import { setJWT, JWT_TYPE } from '../../../../lib/auth/jwt'
import homeServerAPI from '../../../../lib/homeserver/homeServerAPI'

import { STORE_KEY } from '../constants'
import { AppDispatch, RootState } from '../../../'

const refreshTolkien = createAsyncThunk<
  string,
  void,
  {
    dispatch: AppDispatch
    state: RootState
    rejectValue: { error: string }
  }
>(`${STORE_KEY}/refreshTolkien`, async (): Promise<string> => {
  const response = await homeServerAPI<{ JWT: string }>('/auth/refresh', 'POST', {
    sendJWT: false,
    sendCloudUserJWT: true,
  })

  const jwt = (response as { JWT: string })?.JWT

  if (!jwt) {
    throw new Error('Refresh response missing JWT')
  }

  setJWT(jwt, JWT_TYPE.HOME_SERVER_USER)
  return jwt
})

export default refreshTolkien
