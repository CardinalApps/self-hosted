import { createSlice } from '@reduxjs/toolkit'

import { STORE_KEY } from './constants'

export const initialState = {
  activeJobProgress: {},
}

const jobSlice = createSlice({
  name: STORE_KEY,
  initialState,
  reducers: {
    clearActiveJobProgress: (state, { payload }) => {
      if (payload?.except?.length) {
        Object.keys(state.activeJobProgress).forEach((jobId) => {
          const isException = payload.except.map((exception) => exception.id).includes(jobId)
          if (!isException) {
            delete state.activeJobProgress?.[jobId]
          }
        })
      } else {
        state.activeJobProgress = {}
      }
    },
  },
  extraReducers: (builder) => builder
    .addCase('sse/job.current_progress', (state, action) => {
      const { payload } = action as unknown as {
        payload: { progress?: number }
      }
      state.activeJobProgress = payload?.progress || {}
    }),
})

export const jobSelectors = {
  activeJobProgress: (state) => state[STORE_KEY].activeJobProgress,
}

export const jobActions = jobSlice.actions
export default jobSlice
