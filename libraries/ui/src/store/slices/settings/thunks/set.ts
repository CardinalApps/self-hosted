import { createAsyncThunk } from '@reduxjs/toolkit'

import homeServerAPI, { CARDINAL_APP_HEADER } from '../../../../lib/homeserver/homeServerAPI'
import { toastActions } from '../../toast'

import i18n from '../i18n'

import { STORE_KEY } from '../../../../store/slices/settings/constants'
import { AppDispatch, RootState } from '../../../'
import { Settings, SettingsUpdate } from '..'

/**
 * Send settings state to remote endpoint.
 */
const set = createAsyncThunk<
  Settings,
  SettingsUpdate,
  {
    dispatch: AppDispatch
    state: RootState
  }
>(
  `${STORE_KEY}/set`,
  async (
    { settings, app },
    thunkAPI,
  ) => {
  const store = thunkAPI.getState()
  const onError = () => thunkAPI.dispatch(toastActions.addToQueue({
    type: 'danger',
    title: i18n['settings.remote-save-error.title']['en'],
    body: i18n['settings.remote-save-error.desc']['en'],
    ttl: 8000,
  }))

  try {
    await homeServerAPI(`/settings`, 'PATCH', {
      headers: {
        [CARDINAL_APP_HEADER]: store?.app?.app,
      },
      body: {
        settings,
        app,
      },
    })
  } catch (error) {
    onError()
  }

  return settings
})

export default set
