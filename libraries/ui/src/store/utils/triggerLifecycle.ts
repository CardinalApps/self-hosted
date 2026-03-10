import { RootState } from ".."

/**
 * Triggers a set of lifecycle callbacks.
 */
export default function triggerLifecycle(
  state: RootState,
  callbacks: Array<(store: RootState) => void>,
) {
  if (!state || !Object.keys(state).length) {
    return
  }

  for (const cb of callbacks) {
    if (typeof cb === 'function') {
      cb(state)
    }
  }
}
