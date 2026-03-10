import { createAsyncThunk } from '@reduxjs/toolkit'

import homeServerAPI, { CARDINAL_APP_HEADER } from '../../../../lib/homeserver/homeServerAPI'
import { settingsSelectors } from '../../settings'
import { toastActions } from '../../toast'

import { STORE_KEY } from '../constants'

import i18n from './i18n'
import { AppDispatch, RootState } from '../../..'

type HealthCheckResponse = {
  state: string,
  update: {
    latestVersion: string,
  },
}

/**
 * Performs a health check of the Media Server.
 */
const healthCheck = createAsyncThunk<
  HealthCheckResponse,
  void,
  {
    dispatch: AppDispatch
    state: RootState
  }
>(`${STORE_KEY}/health`, async (data: void, thunkAPI) => {
  const store = thunkAPI.getState()

  const res = await homeServerAPI(
    '/health',
    'GET',
    {
      sendJWT: false,
      headers: {
        [CARDINAL_APP_HEADER]: store?.app?.app,
      },
    },
  ) as HealthCheckResponse

  // TODO decouple this from health checks
  if (res?.update) {
    const { lang } = settingsSelectors.current(thunkAPI.getState())
    thunkAPI.dispatch(toastActions.addToQueue({
      title: i18n['toast.update-available.title'][lang],
      body: i18n['toast.update-available.desc'][lang].replaceAll('{version}', res.update.latestVersion),
    }))
  }
  return res
})

export default healthCheck
