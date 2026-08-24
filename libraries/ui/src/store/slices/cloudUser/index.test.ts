import { describe, it, expect } from 'vitest'

import cloudUserSlice, { cloudUserActions } from './index'

const reducer = cloudUserSlice.reducer
// getSelectors() gives selectors that read the slice state directly, without a
// root store to inject the reducer into.
const selectors = cloudUserSlice.getSelectors()
const freshState = () => reducer(undefined, { type: '@@INIT' })

describe('cloudUser slice', () => {
  it('reports an unconfirmed email by default', () => {
    expect(selectors.confirmedEmail(freshState())).toBe(false)
  })

  it('reflects a confirmed email from the fetched user', () => {
    const state = reducer(freshState(), cloudUserActions.setUserData({ confirmedEmail: true }))

    expect(selectors.confirmedEmail(state)).toBe(true)
  })

  // setUserData replaces the whole user, so a payload without the field must
  // not read as confirmed.
  it('treats a missing confirmedEmail as unconfirmed', () => {
    const state = reducer(freshState(), cloudUserActions.setUserData({ publicName: 'Someone' }))

    expect(selectors.confirmedEmail(state)).toBe(false)
  })
})
