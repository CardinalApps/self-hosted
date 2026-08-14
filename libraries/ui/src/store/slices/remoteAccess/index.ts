import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { ConnectionPlan } from '@cardinalapps/remote-access/src/negotiate'

import { STORE_KEY } from './constants'

export type RemoteAccessStatus = 'idle' | 'negotiating' | 'direct' | 'relay' | 'offline' | 'error'

export type RemoteAccessEntry = {
  status: RemoteAccessStatus,
  plan?: ConnectionPlan,
  error?: string,
  lastFetchedAt?: number,
}

export const initialState: Record<string, RemoteAccessEntry> = {}

// Tracks how to reach each known Media Server, keyed by instanceId
const remoteAccessSlice = createSlice({
  name: STORE_KEY,
  initialState,
  reducers: {
    connectionRequested: (state, { payload }: PayloadAction<{ instanceId: string }>) => {
      state[payload.instanceId] = { ...state[payload.instanceId], status: 'negotiating' }
    },
    connectionResolved: (state, { payload }: PayloadAction<{ instanceId: string, plan: ConnectionPlan }>) => {
      state[payload.instanceId] = {
        status: payload.plan.kind,
        plan: payload.plan,
        lastFetchedAt: Date.now(),
      }
    },
    connectionFailed: (state, { payload }: PayloadAction<{ instanceId: string, error: string }>) => {
      state[payload.instanceId] = {
        status: 'error',
        error: payload.error,
        lastFetchedAt: Date.now(),
      }
    },
    connectionInvalidated: (state, { payload }: PayloadAction<{ instanceId: string }>) => {
      delete state[payload.instanceId]
    },
  },
})

export const remoteAccessSelectors = {
  entry: (instanceId: string) => (state): RemoteAccessEntry | undefined => state[STORE_KEY]?.[instanceId],
}

export const remoteAccessActions = remoteAccessSlice.actions
export default remoteAccessSlice
