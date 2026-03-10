import { createSlice } from '@reduxjs/toolkit'

import { globalActions } from '../../constants/actions'

import { STORE_KEY } from './constants'

export interface ModalSliceState {
  open: boolean
  current: number | null
}

const initialState: ModalSliceState = {
  open: false,
  current: null,
}

const modalSlice = createSlice({
  name: STORE_KEY,
  initialState,
  reducers: {
    open: (state) => {
      state.current = 1 // TODO add IDs
      state.open = true
    },
    close: (state) => {
      state.current = null
      state.open = false
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(globalActions.RESET, () => {
        return { ...initialState }
      })
  },
  selectors: {
    isOpen: (state) => state.open,
    current: (state) => state.current,
  },
})

export const modalActions = modalSlice.actions
export const modalSelectors = modalSlice.selectors

export default modalSlice
