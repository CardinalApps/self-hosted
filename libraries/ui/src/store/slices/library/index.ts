import { createSlice } from '@reduxjs/toolkit'

import { globalActions } from '../../constants/actions'

import { STORE_KEY } from './constants'

export interface LibrarySliceState {
  current: string[],
}

const initialState: LibrarySliceState = {
  current: [],
}

const librarySlice = createSlice({
  name: STORE_KEY,
  initialState,
  reducers: {
    set: (state, { payload: selected }) => {
      state.current = selected || []
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(globalActions.RESET, () => {
        return { ...initialState }
      })
  },
  selectors: {
    current: (state) => state.current,
  },
})

export const libraryActions = librarySlice.actions
export const librarySelectors = librarySlice.selectors

export default librarySlice
