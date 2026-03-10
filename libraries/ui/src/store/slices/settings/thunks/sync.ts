import { createAsyncThunk } from '@reduxjs/toolkit'

import homeServerAPI, { CARDINAL_APP_HEADER } from '../../../../lib/homeserver/homeServerAPI'
import { toastActions } from '../../toast'

import { CardinalApp } from '../../../../lib/env/cardinal'
import { STORE_KEY } from '../../../../store/slices/settings/constants'
import { AppDispatch, RootState } from '../../..'

import i18n from '../i18n'

import { Settings } from '..'

/**
 * Send settings state to remote endpoint.
 */
const sync = createAsyncThunk<
  Settings,
  CardinalApp,
  {
    dispatch: AppDispatch
    state: RootState
  }
>(`${STORE_KEY}/sync`, async (app: CardinalApp, thunkAPI) => {
  const store = thunkAPI.getState()
  const onError = () => thunkAPI.dispatch(toastActions.addToQueue({
    type: 'warning',
    title: i18n['settings.sync.fetch-error']['en'],
    body: i18n['settings.sync.fetch-error-desc']['en'],
    ttl: 8000,
  }))

  let settings = {}

  try {
    const res = await homeServerAPI(`/settings/${app}`, 'GET', {
      headers: {
        [CARDINAL_APP_HEADER]: store?.app?.app,
      },
    }) as { settings: Record<string, unknown> }
    settings = res?.settings || {}
  } catch (error) {
    console.log(error)
    onError()
    throw new Error(i18n['settings.sync.fetch-error']['en'])
  }

  return settings
})

export default sync
