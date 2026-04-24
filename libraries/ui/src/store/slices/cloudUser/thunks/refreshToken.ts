import { createAsyncThunk } from '@reduxjs/toolkit'

import { setJWT, JWT_TYPE } from '../../../../lib/auth/jwt'
import authAPI from '../../../../lib/auth/authAPI'

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
  const response = await authAPI<{ JWT: string }>('/auth/refresh', 'POST', {
    sendJWT: false,
  })

  const { JWT: jwt } = response as { JWT: string }

  if (!jwt) {
    throw new Error('Refresh response missing JWT')
  }

  setJWT(jwt, JWT_TYPE.CLOUD_USER)
  return jwt
})

export default refreshToken
