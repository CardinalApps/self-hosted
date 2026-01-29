import { createSlice, PayloadAction } from '@reduxjs/toolkit'

import { globalActions } from '../../constants/actions'

import { CardinalApp } from '../../../lib/env/cardinal'

import { STORE_KEY } from './constants'

type AppSliceState = {
  app: CardinalApp,
  version: string | null,
  cardinalAppId: string | null,
  cardinalAppPermissions: string | null,
  kioskMode: boolean | false,
  resetAt: number | null,
  basePath: string,
  cloudStatus: {
    isLoading: boolean,
    reachable: boolean,
    lastCheckedAt: number | null,
  },
}

const initialState: AppSliceState = {
  app: null,
  version: null,
  cardinalAppId: null,
  cardinalAppPermissions: null,
  kioskMode: false,
  resetAt: null,
  basePath: '',
  cloudStatus: {
    isLoading: false,
    reachable: true,
    lastCheckedAt: null,
  },
}

const appSlice = createSlice({
  name: STORE_KEY,
  initialState,
  reducers: {
    // Assigned by the Cardinal App Registry
    setCardinalApp: (state, action: PayloadAction<string>) => {
      state.app = action.payload as CardinalApp
    },
    // Assigned by the Cardinal App Registry
    setCardinalAppId: (state, action: PayloadAction<string>) => {
      state.cardinalAppId = action.payload
    },
    // Verified by the Cardinal App Registry
    setCardinalAppPermissions: (state, action: PayloadAction<string>) => {
      state.cardinalAppPermissions = action.payload
    },
    setVersion: (state, action: PayloadAction<string>) => {
      state.version = action.payload
    },
    setKioskMode: (state, action: PayloadAction<boolean>) => {
      state.kioskMode = action.payload
    },
    setBasePath: (state, action: PayloadAction<string>) => {
      state.basePath = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(globalActions.RESET, (state) => {
        return {
          ...state,
        }
      })
  },
  selectors: {
    app: (state) => state.app,
    cardinalAppId: (state) => state.cardinalAppId,
    version: (state) => state.version,
    kioskMode: (state) => state.kioskMode,
    basePath: (state) => state.basePath,
  },
})

export const appSelectors = appSlice.selectors
export const appActions = appSlice.actions

export default appSlice
