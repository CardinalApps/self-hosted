import { createAsyncThunk } from '@reduxjs/toolkit'

import authAPI from '../../../../lib/auth/authAPI'
import { deleteJwt } from '../../../../lib/auth/jwt'

import { STORE_KEY } from '../constants'

/**
 * Logs a user out.
 */
const cloudUserLogout = createAsyncThunk(`${STORE_KEY}/logout`, async () => {
  authAPI('/user/session', 'DELETE')
  deleteJwt()

  return true
})

export default cloudUserLogout
