import { createAsyncThunk } from '@reduxjs/toolkit'
import homeServerAPI from '../../../../lib/homeserver/homeServerAPI'
import { AppDispatch, RootState } from '../../..'
import { STORE_KEY } from '../constants'

/**
 * Check the instance ID of this server.
 */
const fetchInstanceId = createAsyncThunk<
  string,
  void,
  {
    dispatch: AppDispatch
    state: RootState
  }
>(`${STORE_KEY}/fetchInstanceId`, async (data: void, thunkAPI) => {
  const cached = thunkAPI.getState().homeServer.instanceId

  if (!cached) {
    const res: Record<string, unknown> = await homeServerAPI('/instance')

    if (res?.instanceId) {
      return res.instanceId as string
    } else {
      throw new Error()
    }

  }
})

export default fetchInstanceId
