import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { getDefaultSettings, getSetting } from '@cardinalapps/app-settings/src'

import set from './thunks/set'
import sync from './thunks/sync'

import homeServerLogout from '../homeServerUser/thunks/logout'
import { globalActions } from '../../constants/actions'

import { STORE_KEY } from './constants'
import { CardinalApp, getAppBasePathFromUrl } from '../../../lib/env/cardinal'

// Seed client-stored defaults (eg. theme) for the running app so they are
// present before the first server sync. The server no longer stores these.
// Falls back to admin outside a known app (eg. storybook, kiosk).
const currentApp = (getAppBasePathFromUrl() as CardinalApp) || CardinalApp.ADMIN
const clientDefaults = getDefaultSettings(currentApp, 'en', 'client')
const langSetting = getSetting('lang')(currentApp, 'en')

export type Setting = {
  key: string,
  value: unknown,
}

export type Settings = {
  [key: string]: unknown,
}

export type SettingsUpdate = {
  settings: Settings,
  app: CardinalApp,
}

type InitialState = {
  sync: {
    loading: boolean,
    error: string | null,
  },
  current: {
    [slug: string]: unknown,
    lang: string,
  },
}

const initialState: InitialState = {
  sync: {
    loading: false,
    error: null,
  },
  current: {
    ...clientDefaults,
    [langSetting.slug]: langSetting.defaultValue,
    lang: 'en',
  },
}

const settingsSlice = createSlice({
  name: STORE_KEY,
  initialState,
  reducers: {
    set: (state, action: PayloadAction<Setting>) => {
      state.current[action.payload.key] = action.payload.value
    },
    setAll: (state, { payload }) => {
      state.current = payload
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(globalActions.RESET, () => {
        return { ...initialState }
      })
      /**
       * Reset app settings after logout
       */
      .addCase(homeServerLogout.fulfilled, () => {
        return { ...initialState }
      })
      /**
       * "set" thunk cases
       */
      .addCase(set.pending, (state) => {
        state.sync.loading = true
        state.sync.error = null
      })
      .addCase(set.fulfilled, (state, { payload }) => {
        state.sync.loading = false
        state.sync.error = null
        state.current = {
          ...state.current,
          ...payload,
        }
      })
      .addCase(set.rejected, (state) => {
        state.sync.loading = false
        state.sync.error = 'Fetch error'
      })
    builder
      /**
       * "sync" thunk cases
       */
      .addCase(sync.pending, (state) => {
        state.sync.loading = true
        state.sync.error = null
      })
      .addCase(sync.fulfilled, (state, { payload }) => {
        state.sync.loading = false
        state.sync.error = null
        state.current = {
          ...state.current,
          ...payload,
        }
      })
      .addCase(sync.rejected, (state) => {
        state.sync.loading = false
        state.sync.error = 'Fetch error'
      })
  },
  selectors: {
    syncing: (state) => state.sync.loading,
    syncError: (state) => state.sync.error,
    current: (state) => state.current,
  },
})

export const settingsActions = settingsSlice.actions
export const settingsSelectors = settingsSlice.selectors

export default settingsSlice
