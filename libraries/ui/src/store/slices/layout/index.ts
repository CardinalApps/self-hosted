import { createSlice, PayloadAction } from '@reduxjs/toolkit'

import { globalActions } from '../../constants/actions'

import { STORE_KEY, SIDEBAR_MODE, PAGE_LAYOUT } from './constants'

export type ActionButton = {
  gradientAnimation?: string,
}

export type VirtualView = {
  total: number,
  start: number,
  offset: number,
  end: number,
}

export type LayoutSliceState = {
  current: PAGE_LAYOUT,
  pageTitle: string,
  mobileNavIsOpen: boolean,
  mobileFileBrowserIsOpen: boolean,
  scrollPoints: Record<string, unknown>,
  toolbarValues: {
    [toolbarName: string]: Record<string, unknown>,
  },
  virtualViews: {
    [name: string]: VirtualView,
  },
  actionButtons: {
    [name: string]: ActionButton,
  },
  showLibrarySwitcher: boolean,
  pageDocLink: string,
  settingsPanelOpen: boolean,
  settingsPanelTop: string,

  // The actual current mode of the sidebar
  sidebarMode: SIDEBAR_MODE,
  // The sidebar mode that the user wants; it can be overridden by the layout and this is used to restore it
  userSelectedSidebarMode: SIDEBAR_MODE,
}

const initialState: LayoutSliceState = {
  current: PAGE_LAYOUT.standard,
  pageTitle: '',
  mobileNavIsOpen: false,
  mobileFileBrowserIsOpen: false,
  scrollPoints: {},
  toolbarValues: {},
  virtualViews: {},
  actionButtons: {},
  showLibrarySwitcher: false,
  pageDocLink: '',
  settingsPanelOpen: false,
  settingsPanelTop: '45vh',
  sidebarMode: SIDEBAR_MODE.expanded,
  userSelectedSidebarMode: SIDEBAR_MODE.expanded,
}

const layoutSlice = createSlice({
  name: STORE_KEY,
  initialState,
  reducers: {
    setLayout: (state, action: PayloadAction<PAGE_LAYOUT>) => {
      const { payload } = action
      if (payload) {
        state.current = payload
      } else {
        state.current = PAGE_LAYOUT.standard
      }
    },
    setPageTitle: (state, action: PayloadAction<string>) => {
      state.pageTitle = action.payload
    },
    setPageDocLink: (state, action: PayloadAction<string>) => {
      state.pageDocLink = action.payload
    },
    setMobileNavIsOpen: (state, action: PayloadAction<boolean>) => {
      state.mobileNavIsOpen = action.payload
    },
    setMobileFileBrowserIsOpen: (state, action: PayloadAction<boolean>) => {
      state.mobileFileBrowserIsOpen = action.payload
    },
    setSidebarMode: (state, action: PayloadAction<SIDEBAR_MODE>) => {
      state.sidebarMode = action.payload
    },
    setActionButton: (state, action: PayloadAction<{ buttonName: string, button: ActionButton }>) => {
      state.actionButtons[action.payload.buttonName] = action.payload.button
    },
    setShowLibrarySwitcher: (state, action: PayloadAction<boolean>) => {
      state.showLibrarySwitcher = action.payload
    },
    setSettingsPanelOpen: (state, action: PayloadAction<boolean>) => {
      state.settingsPanelOpen = action.payload
      if (!action.payload) {
        state.settingsPanelTop = initialState.settingsPanelTop
      }
    },
    setSettingsPanelTop: (state, action: PayloadAction<string>) => {
      state.settingsPanelTop = action.payload
    },
    setUserSelectedSidebarMode: (state, action: PayloadAction<SIDEBAR_MODE>) => {
      state.userSelectedSidebarMode = action.payload
    },
    saveScrollPoint: (state, action: PayloadAction<{ name: string, px: number }>) => {
      const { name, px } = action.payload
      state.scrollPoints[name] = px
    },
    resetScrollPoint: (state, action: PayloadAction<string>) => {
      const name = action.payload
      state.scrollPoints[name] = 0
    },
    removeScrollPoint: (state, action: PayloadAction<string>) => {
      delete state.scrollPoints?.[action.payload]
    },
    removeActionButton: (state, action: PayloadAction<string>) => {
      delete state.actionButtons?.[action.payload]
    },
    removeAllScrollPoints: (state) => {
      state.scrollPoints = initialState.scrollPoints
    },
    initToolbarValues: (state, action: PayloadAction<{ name: string, values: Record<string, unknown> }>) => {
      const { name, values } = action.payload
      if (!state.toolbarValues?.[name]) {
        state.toolbarValues[name] = values
      }
    },
    setToolbarValue: (state, action: PayloadAction<{ name: string, key: string, value: unknown }>) => {
      const { name, key, value } = action.payload
      state.toolbarValues[name][key] = value
    },
    setToolbarValues: (state, action: PayloadAction<{ name: string, values: Record<string, unknown> }>) => {
      const { name, values } = action.payload
      state.toolbarValues[name] = values
    },
    removeToolbarValues: (state, action: PayloadAction<string>) => {
      delete state.toolbarValues?.[action.payload]
    },
    removeAllToolbarValues: (state) => {
      state.toolbarValues = initialState.toolbarValues
    },
    setVirtualView: (state, action: PayloadAction<{ name: string, value: VirtualView }>) => {
      const { name, value } = action.payload
      state.virtualViews[name] = value
    },
    removeVirtualView: (state, action: PayloadAction<string>) => {
      delete state.virtualViews?.[action.payload]
    },
    removeAllVirtualViews: (state) => {
      state.virtualViews = initialState.virtualViews
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
    current: (state) => state.current,
    pageTitle: (state) => state.pageTitle,
    pageDocLink: (state) => state.pageDocLink,
    actionButtons: (state) => state.actionButtons,
    mobileNavIsOpen: (state) => state.mobileNavIsOpen,
    mobileFileBrowserIsOpen: (state) => state.mobileFileBrowserIsOpen,
    sidebarMode: (state) => state.sidebarMode,
    userSelectedSidebarMode: (state) => state.userSelectedSidebarMode,
    toolbarValues: (state) => state.toolbarValues,
    virtualViews: (state) => state.virtualViews,
    scrollPoints: (state) => state.scrollPoints,
    showLibrarySwitcher: (state) => state.showLibrarySwitcher,
    settingsPanelOpen: (state) => state.settingsPanelOpen,
    settingsPanelTop: (state) => state.settingsPanelTop,
  },
})

export * from './constants'

export const layoutSelectors = layoutSlice.selectors
export const layoutActions = layoutSlice.actions

export default layoutSlice
