import { createAsyncThunk } from '@reduxjs/toolkit'

import { setJWT, JWT_TYPE } from '../../../../lib/auth/jwt'
import authAPI from '../../../../lib/auth/authAPI'

import { STORE_KEY } from '../constants'
import { AppDispatch, RootState } from '../../../'

const redeemExchangeToken = createAsyncThunk<
  string,
  { exchangeToken: string, instanceId?: string },
  {
    dispatch: AppDispatch
    state: RootState
    rejectValue: { error: string }
  }
>(`${STORE_KEY}/redeemExchangeToken`, async ({ exchangeToken, instanceId }): Promise<string> => {
  const response = await authAPI<{ JWT: string }>('/auth/exchange', 'POST', {
    sendJWT: false,
    body: { token: exchangeToken, ...(instanceId ? { instanceId } : {}) },
  })

  const { JWT: jwt } = response

  if (!jwt) {
    throw new Error('Exchange response missing JWT')
  }

  setJWT(jwt, JWT_TYPE.CLOUD_USER)
  return jwt
})

export default redeemExchangeToken
