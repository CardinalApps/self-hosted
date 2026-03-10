import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { v4 as uuid } from 'uuid'

import { STORE_KEY } from './constants'

export type Toast = {
  toastId: string,
  title: string,
  body?: string,
  ttl?: number,
  type?: 'danger' | 'warning' | 'success',
  showClose?: boolean,
}

type ToastSliceState = {
  queue: Toast[],
}

const initialState: ToastSliceState = {
  queue: [],
}

const toastSlice = createSlice({
  name: STORE_KEY,
  initialState,
  reducers: {
    addToQueue: (state, { payload }: PayloadAction<Omit<Toast, "toastId">>) => {
      state.queue = [...state.queue, { toastId: uuid(), ...payload }]
    },
    removeFromQueue: (state, { payload }: PayloadAction<string>) => {
      state.queue = state.queue.filter((toast) => toast.toastId !== payload)
    },
    flushQueue: (state) => {
      state.queue = []
    },
    shiftQueue: (state) => {
      const newQueue = [...state.queue]
      newQueue.shift()
      state.queue = newQueue
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase('RESET_APP', () => {
        return { ...initialState }
      })
  },
  selectors: {
    queue: (state) => state.queue,
    numInQueue: (state) => state.queue.length,
    nextInQueue: (state) => state.queue[0],
    lastInQueue: (state) => state.queue[state.queue.length - 1],
  },
})

export const toastSelectors = toastSlice.selectors
export const toastActions = toastSlice.actions

export default toastSlice
