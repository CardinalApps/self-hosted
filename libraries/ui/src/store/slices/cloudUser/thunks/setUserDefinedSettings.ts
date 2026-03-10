import { createAsyncThunk } from '@reduxjs/toolkit'

import authAPI from '../../../../lib/auth/authAPI'

import { STORE_KEY } from '../constants'

/**
 * "User defined settings" are the settings that the user sets. For example,
 * their MFA preference, or their email notification settings.
 *
 * User defined settings are not PII.
 */
const setUserDefinedSettings = createAsyncThunk<
  Record<string, unknown>,
  Record<string, unknown>
>(`${STORE_KEY}/setUserDefinedSetting`, (payload) => {
  return new Promise((resolve, reject) => {
    authAPI('/user', 'PATCH', {
      body: {
        userDefinedSettings: {
          ...(payload),
        },
      },
    })
      .then(() => {
        resolve(payload)
      })
      .catch((error) => {
        reject()
        console.log(error)
      })
  })
})

export default setUserDefinedSettings
