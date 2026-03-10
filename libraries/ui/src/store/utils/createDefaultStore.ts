import type { Slice } from "@reduxjs/toolkit"
import { RootState } from ".."

/**
 * Creates a new initial store state with the given slices.
 */
export default function createDefaultStore(slices: Record<string, Slice | unknown>): RootState {
  const defaultState = {}

  for (const [key, slice] of Object.entries(slices)) {
    if (
      typeof slice === 'object'
      && slice !== null
      && 'getInitialState' in slice
      && typeof slice.getInitialState === 'function'
    ) {
      defaultState[key] = slice.getInitialState()
    }
  }

  return JSON.parse(JSON.stringify(defaultState))
}
