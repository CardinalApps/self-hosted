import { createSlice, PayloadAction } from '@reduxjs/toolkit'

import { globalActions } from '../../constants/actions'
import healthCheck from './thunks/healthCheck'

import { STORE_KEY } from './constants'

type HomeServerSliceState = {
  health: {
    state: string | null,
    loading: boolean,
    responses: Array<{
      response: string,
    }>,
  },
  latestEvent: Record<string, unknown> | null,
  firstTimeSetupComplete: boolean,
  instanceId: string | null,
  serverName: string | null,
}

const initialState: HomeServerSliceState = {
  health: {
    state: null,
    loading: false,
    responses: [],
  },
  latestEvent: null,
  firstTimeSetupComplete: null,
  instanceId: null,
  serverName: null,
}

const homeServerSlice = createSlice({
  name: STORE_KEY,
  initialState,
  reducers: {
    setLatestEvent: (state, action: PayloadAction<Record<string, unknown>>) => {
      state.latestEvent = action.payload
    },
    setFirstTimeSetupComplete: (state, action: PayloadAction<boolean>) => {
      state.firstTimeSetupComplete = action.payload
    },
    setInstanceId: (state, action: PayloadAction<string>) => {
      state.instanceId = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(globalActions.RESET, () => {
        return { ...initialState }
      })
      /**
       * Health checks
       */
      .addCase(healthCheck.pending, (state) => {
        state.health.loading = true
      })
      .addCase(healthCheck.fulfilled, (state, action: PayloadAction<{ state: string }>) => {
        // const resObj = {
        //   response: payload
        //   timestamp: Date.now(),
        // }
        state.health.loading = false
        state.health.state = action.payload?.state || 'error'
        //state.health.responses = [resObj, ...state.health.responses].slice(0, 100)
      })
      .addCase(healthCheck.rejected, (state) => {
        // const resObj = {
        //   response: payload,
        //   timestamp: Date.now(),
        // }
        state.health.loading = false
        state.health.state = 'error'
        //state.health.responses = [resObj, ...state.health.responses].slice(0, 100)
      })
  },
  selectors: {
    health: (state) => state.health.state,
    loading: (state) => state.health.loading,
    healthResponses: (state) => state.health.responses,
    latestHealthResponse: (state) => state.health.responses?.[0] || undefined,
    latestEvent: (state) => state.latestEvent || undefined,
    firstTimeSetupComplete: (state) => state.firstTimeSetupComplete,
  },
})

export const homeServerSelectors = homeServerSlice.selectors
export const homeServerActions = homeServerSlice.actions

export default homeServerSlice
