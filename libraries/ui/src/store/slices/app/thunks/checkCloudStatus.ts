/**
 * FIXME this is not being used
 */

import { createAsyncThunk } from '@reduxjs/toolkit'

import ms from 'ms'

import authAPI from '../../../../lib/auth/authAPI'

import { STORE_KEY } from '../constants'
import { AppDispatch, RootState } from '../../..'

const checkInterval = ms('8 minutes')

/**
 * Check the status of Cardinal's cloud services.
 */
const checkCloudStatus = createAsyncThunk<
  Record<string, unknown>,
  Record<string, unknown>,
  {
    dispatch: AppDispatch
    state: RootState
  }
>(`${STORE_KEY}/checkCloudStatus`, async (payload, thunkAPI) => {
  const lastCheckedAt = thunkAPI.getState().app.cloudStatus.lastCheckedAt

  if (lastCheckedAt === null || Date.now() - new Date(lastCheckedAt).getTime() <= checkInterval) {
    const res = await authAPI<Record<string, unknown>>('/health')
    // FIXME I don't think the res.ok belongs here
    if (res.ok) {
      return { ...payload }
    } else {
      throw new Error()
    }

  }
})

export default checkCloudStatus
