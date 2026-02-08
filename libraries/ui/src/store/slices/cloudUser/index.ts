import { createSlice, PayloadAction } from '@reduxjs/toolkit'

import fetchCloudUser, { FetchCloudUserSuccess } from './thunks/fetch'
import setUserDefinedSettings from './thunks/setUserDefinedSettings'
import cloudUserLogout from './thunks/logout'

import { globalActions } from '../../constants/actions'

import { STORE_KEY } from './constants'

export type CloudUser = {
  role?: string | null,
  createdAt?: string | null,
  avatar?: Record<string, string>,
  publicName?: string,
  subscription?: string,
  userDefinedSettings?: Record<string, unknown>,
  pii?: Record<string, unknown>,
}

type CloudUserSliceState = {
  loggedIn: boolean | null,
  loading: boolean,
  fetchStatus: 'success' | 'error' | null,
  updateUserDefinedSettingsIsLoading: boolean,
  current: CloudUser,
}

const initialState: CloudUserSliceState = {
  loggedIn: false,
  loading: false,
  fetchStatus: null,
  updateUserDefinedSettingsIsLoading: false,
  current: {
    role: null,
    createdAt: null,
    avatar: {},
    publicName: '',
    subscription: '',
    userDefinedSettings: {},
  },
}

const cloudUserSlice = createSlice({
  name: STORE_KEY,
  initialState,
  reducers: {
    setLoggedIn: (state, action: PayloadAction<boolean>) => {
      return {
        ...state,
        loggedIn: action.payload,
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      return {
        ...state,
        loading: action.payload,
      }
    },
    setUserData: (state, action: PayloadAction<CloudUser>) => {
      return {
        ...state,
        current: {
          ...action.payload,
        },
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(globalActions.RESET, () => {
        return { ...initialState }
      })
      /**
       * fetchCloudUser thunk cases
       */
      .addCase(fetchCloudUser.pending, (state) => {
        return {
          ...state,
          loading: true,
        }
      })
      .addCase(fetchCloudUser.fulfilled, (state, action: PayloadAction<FetchCloudUserSuccess>) => {
        switch (action.payload.status) {
          // Session and user are valid
          case 200:
            return {
              ...state,
              loggedIn: true,
              loading: false,
              fetchStatus: 'success',
              current: { ...action.payload.user },
            }

          // 401 = expired token || server revoked the session || server secret changed
          // 410 = the account was deleted
          case 401:
          case 410:
            return {
              ...state,
              loggedIn: false,
              loading: false,
              fetchStatus: 'success',
              current: {},
            }

          // All 500s are handled the same - we don't want to interrupt the
          // cached user session when there's a server side issue
          case '5xx':
            return {
              ...state,
              loggedIn: true,
              loading: false,
              fetchStatus: 'error',
              current: { ...state.current },
            }

          case false:
            console.error('Internal application error. Something with the fetchCloudUser thunk is not working.')
            return {
              ...state,
              loggedIn: false,
              loading: false,
              fetchStatus: 'error',
              current: { ...state.current },
            }

          default:
            console.error('The app does not know how to handle the returned auth server HTTP status.')
            return {
              ...state,
              loggedIn: false,
              loading: false,
              fetchStatus: 'error',
              current: { ...state.current },
            }
        }
      })
      .addCase(fetchCloudUser.rejected, (state) => {
        return {
          ...state,
          loggedIn: false,
          loading: false,
          fetchStatus: null,
          current: { ...initialState.current },
        }
      })

      /**
       * setUserDefinedSettings thunk cases
       */
      .addCase(setUserDefinedSettings.pending, (state) => {
        return {
          ...state,
          updateUserDefinedSettingsIsLoading: true,
        }
      })
      .addCase(setUserDefinedSettings.fulfilled, (state, action) => {
        return {
          ...state,
          updateUserDefinedSettingsIsLoading: false,
          current: {
            ...state.current,
            userDefinedSettings: {
              ...state.current.userDefinedSettings,
              ...action.payload,
            },
          },
        }
      })
      .addCase(setUserDefinedSettings.rejected, (state) => {
        return {
          ...state,
          updateUserDefinedSettingsIsLoading: false,
        }
      })

      /**
       * logout thunk cases
       */
      .addCase(cloudUserLogout.pending, (state) => {
        return { ...state }
      })
      .addCase(cloudUserLogout.fulfilled, () => {
        return { ...initialState }
      })
      .addCase(cloudUserLogout.rejected, () => {
        return { ...initialState }
      })
  },
  selectors: {
    user: (state) => state,
    fetchStatus: (state) => state.fetchStatus,
    loggedIn: (state) => state?.loggedIn,
    loading: (state) => state.loading,
    current: (state) => state.current,
    currentUserRole: (state) => state.current?.role,
    userDefinedSettings: (state) => state.current?.userDefinedSettings,
  },
})


export const cloudUserSelectors = cloudUserSlice.selectors
export const cloudUserActions = cloudUserSlice.actions

export default cloudUserSlice
