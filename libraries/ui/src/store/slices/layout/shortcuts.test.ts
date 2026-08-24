import { describe, it, expect } from 'vitest'

import layoutSlice from './index'
import { SIDEBAR_MODE } from './constants'
import { shortcutActions } from '../../constants/actions'

const reducer = layoutSlice.reducer
const freshState = () => reducer(undefined, { type: '@@INIT' })

describe('layout reactions to keyboard shortcuts', () => {
  it('opens the settings panel', () => {
    const state = reducer(freshState(), { type: shortcutActions.OPEN_SETTINGS })

    expect(state.settingsPanelOpen).toBe(true)
  })

  // The panel is closed with Esc, so firing the shortcut again must not close it out from
  // under someone who pressed it twice
  it('leaves an open settings panel open', () => {
    const opened = reducer(freshState(), { type: shortcutActions.OPEN_SETTINGS })
    const state = reducer(opened, { type: shortcutActions.OPEN_SETTINGS })

    expect(state.settingsPanelOpen).toBe(true)
  })

  it('toggles the playback sidebar both ways', () => {
    const opened = reducer(freshState(), { type: shortcutActions.TOGGLE_PLAYBACK_SIDEBAR })
    const closed = reducer(opened, { type: shortcutActions.TOGGLE_PLAYBACK_SIDEBAR })

    expect(opened.playbackSidebarOpen).toBe(true)
    expect(closed.playbackSidebarOpen).toBe(false)
  })

  /*
   * Collapsing records the choice as well as applying it, the same as the sidebar's own button:
   * layouts that force a collapse restore the user's choice from it when they are left.
   */
  it('collapses and expands the nav sidebar, remembering the choice', () => {
    const collapsed = reducer(freshState(), { type: shortcutActions.TOGGLE_NAV_SIDEBAR })

    expect(collapsed.sidebarMode).toBe(SIDEBAR_MODE.collapsed)
    expect(collapsed.userSelectedSidebarMode).toBe(SIDEBAR_MODE.collapsed)

    const expanded = reducer(collapsed, { type: shortcutActions.TOGGLE_NAV_SIDEBAR })

    expect(expanded.sidebarMode).toBe(SIDEBAR_MODE.expanded)
    expect(expanded.userSelectedSidebarMode).toBe(SIDEBAR_MODE.expanded)
  })
})
