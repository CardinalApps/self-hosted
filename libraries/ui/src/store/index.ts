import { combineSlices, configureStore } from '@reduxjs/toolkit'
import type { Action, ThunkAction } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/query'
import merge from 'lodash.merge'

/**
 * Slices
 */
import appSlice from './slices/app'
import settingsSlice from './slices/settings'
import cloudUserSlice from './slices/cloudUser'
import homeServerSlice from './slices/homeServer'
import homeServerUserSlice from './slices/homeServerUser'
import toastSlice from './slices/toast'
import modalSlice from './slices/modal'
import drawerSlice from './slices/drawer'
import indexingSlice from './slices/indexing'
import jobsSlice from './slices/jobs'
import layoutSlice from './slices/layout'
import audioSlice from './slices/music'
import librarySlice from './slices/library'

/**
 * APIs
 */
import { baseHomeServerApi } from './apis/baseHomeServerApi'

/**
 * Middleware
 */
import resetMiddleware from './middleware/reset'
import sseFactoryResetMiddleware from './middleware/sseFactoryReset'
import sseLatestEventMiddleware from './slices/homeServer/middleware/sseLatestEvent'
import logHTTPError from './middleware/logHTTPError'

/**
 * Lifecycle
 */
import musicBeforeStoreInit from './slices/music/lifecycle/beforeStoreInit'

/**
 * Utils
 */
import getCachedStore from './utils/getCachedStore'
import createDefaultStore from './utils/createDefaultStore'
import deletePendingRTKCache from './utils/deletePendingRTKCache'
import triggerLifecycle from './utils/triggerLifecycle'
import { getStorageKey } from './utils/getStorageKey'
import deleteInfiniteQueryCache from './utils/deleteInfiniteQueryCache'
import deleteApiCache from './utils/deleteApiCache'

/**
 * All apps use a store of this shape.
 */
const slices = {
  [appSlice.reducerPath]: appSlice,
  [homeServerSlice.reducerPath]: homeServerSlice,
  [homeServerUserSlice.reducerPath]: homeServerUserSlice,
  [cloudUserSlice.reducerPath]: cloudUserSlice,
  [settingsSlice.reducerPath]: settingsSlice,
  [librarySlice.reducerPath]: librarySlice,
  [toastSlice.reducerPath]: toastSlice,
  [modalSlice.reducerPath]: modalSlice,
  [drawerSlice.reducerPath]: drawerSlice,
  [indexingSlice.reducerPath]: indexingSlice,
  [jobsSlice.reducerPath]: jobsSlice,
  [layoutSlice.reducerPath]: layoutSlice,
  [audioSlice.reducerPath]: audioSlice,
  [baseHomeServerApi.reducerPath]: baseHomeServerApi,
}

const rootReducer = combineSlices(...Object.values(slices))
export type RootState = ReturnType<typeof rootReducer>

/**
 * Create a new initial store and hydrate it with the cached store if one
 * exists. Also clean up some RTK API calls before hydrating.
 */
const createStore = () => {
  const preloadedState = createDefaultStore(slices)
  const cachedStore = getCachedStore()

  merge(preloadedState, cachedStore)

  // FIXME delete these two once all of the RTK APIs extend the base
  deletePendingRTKCache(preloadedState)
  deleteInfiniteQueryCache(preloadedState)

  // This replaces the above two
  deleteApiCache(preloadedState)

  // Before store init lifecycle
  triggerLifecycle(preloadedState, [
    musicBeforeStoreInit,
  ])

  const store = configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) => {
      return getDefaultMiddleware().concat(
        resetMiddleware.middleware,
        sseFactoryResetMiddleware.middleware,
        sseLatestEventMiddleware.middleware,
        logHTTPError.middleware,
        baseHomeServerApi.middleware,
      )
    },
    preloadedState,
  })

  setupListeners(store.dispatch)

  const writeThrottle = 2000
  let storeLastSavedAt = 0

  // Cache the store after every change
  store.subscribe(() => {
    try {
      if (Date.now() - storeLastSavedAt > writeThrottle) {
        const state = store.getState()
        localStorage.setItem(getStorageKey(), JSON.stringify(state) || '{}')
        storeLastSavedAt = Date.now()
      }
    } catch (e) {
      console.error(e?.message)
    }
  })

  return store
}

export const store = createStore()

export type AppStore = typeof store
export type AppDispatch = AppStore['dispatch']
export type AppThunk<ThunkReturnType = void> = ThunkAction<
  ThunkReturnType,
  RootState,
  unknown,
  Action
>

export default store
