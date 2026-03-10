import { createSlice, PayloadAction } from '@reduxjs/toolkit'

import homeServerLogin, { HomeServerLoginResponse } from './thunks/login'
import reloadHomeServerUser from './thunks/reload'
import homeServerLogout from './thunks/logout'

import { globalActions } from '../../constants/actions'

import { STORE_KEY } from './constants'
import { UserType } from '../../../types/user'

type HomeServerUserSliceState = {
  loading: boolean,
  loggedInAt: number | null,
  loginRedirectCompletedFor: number | null,
  current: UserType,
}

const initialState: HomeServerUserSliceState = {
  loading: false,
  loggedInAt: null,
  // When a user logs in sometimes we want to redirect them to the Dashboard
  // from wherever they are (usually from the login page). This timestamp gets
  // set to match the login timestamp for which the redirect has been completed.
  loginRedirectCompletedFor: null,
  current: {},
}

const homeServerUserSlice = createSlice({
  name: STORE_KEY,
  initialState,
  reducers: {
    setCurrent: (state, action: PayloadAction<UserType>) => {
      return {
        ...state,
        current: action.payload,
      }
    },
    setLoginRedirectCompletedFor: (state, action: PayloadAction<number>) => {
      return {
        ...state,
        loginRedirectCompletedFor: action.payload,
      }
    },
    logout: (state) => {
      return {
        ...state,
        current: {},
      }
    },
  },
  extraReducers: (builder) => builder
    .addCase(globalActions.RESET, () => {
      return { ...initialState }
    })
    /**
     * login thunk cases
     */
    .addCase(homeServerLogin.pending, (state) => {
      return {
        ...state,
        loading: true,
      }
    })
    .addCase(homeServerLogin.fulfilled, (state, action: PayloadAction<HomeServerLoginResponse>) => {
      const now = Date.now()
      return {
        ...state,
        loading: false,
        current: action.payload?.user || {},
        loggedInAt: now,
        loginRedirectCompletedFor: action.payload?.redirectOutOfNextLoginPageVisit ? null : now,
      }
    })
    .addCase(homeServerLogin.rejected, (state) => {
      return {
        ...state,
        loading: false,
        loggedInAt: null,
        loginRedirectCompletedFor: null,
        current: {},
      }
    })
    /**
     * reloadUser thunk cases
     */
    .addCase(reloadHomeServerUser.pending, (state) => {
      return {
        ...state,
        loading: true,
      }
    })
    .addCase(reloadHomeServerUser.fulfilled, (state, { payload }) => {
      return {
        ...state,
        loading: false,
        current: payload?.localUser || {},
      }
    })
    .addCase(reloadHomeServerUser.rejected, (state) => {
      return {
        ...state,
        loading: false,
      }
    })
    /**
     * logout thunk cases
     */
    .addCase(homeServerLogout.pending, (state) => {
      return {
        ...state,
        loading: true,
      }
    })
    .addCase(homeServerLogout.fulfilled, () => {
      return {
        ...initialState,
      }
    })
    .addCase(homeServerLogout.rejected, (state) => {
      return {
        ...state,
        loading: false,
      }
    }),
  selectors: {
    loading: (state) => state.loading,
    loggedIn: (state) => !!Object.keys(state.current).length,
    loggedInAt: (state) => state.loggedInAt,
    loginRedirectCompletedFor: (state) => state.loginRedirectCompletedFor,
    current: (state) => state.current,
  },
})

export const homeServerUserActions = homeServerUserSlice.actions
export const homeServerUserSelectors = homeServerUserSlice.selectors

export default homeServerUserSlice
