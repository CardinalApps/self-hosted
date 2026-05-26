import type { Page } from '@playwright/test'

/*
  Test-only helpers that drive the in-page Redux store directly via the
  `window.__testDispatch` seam exposed by admin-web's main.tsx when
  VITE_E2E=true.

  Why: `useServerSideEvents` turns every SSE message into a Redux action of
  the form `{ type: 'sse/<event_name>', payload }`. The reducers are pure —
  they don't care whether the action came from a real EventSource or from a
  test. Bypassing the network lets us deterministically replay any sequence
  of events (idle → indexing → paused → completed → errored) without
  standing up real server work.
*/

type DispatchableAction = {
  type: string,
  payload?: unknown,
}

// Replays a single Redux action through the in-page store. Throws if the
// test seam is missing — that almost always means the dev server wasn't
// started with VITE_E2E=true.
export async function dispatchAction(page: Page, action: DispatchableAction): Promise<void> {
  await page.evaluate((a) => {
    const fn = (window as unknown as { __testDispatch?: (action: unknown) => void }).__testDispatch
    if (typeof fn !== 'function') {
      throw new Error(
        '`window.__testDispatch` is not defined. Start the admin-web dev server with VITE_E2E=true so the seam in main.tsx is included in the bundle.',
      )
    }
    fn(a)
  }, action)
}

// Convenience wrapper that prefixes the type with `sse/` to match the shape
// the real `useServerSideEvents` hook dispatches. Use this for any indexing
// or job event (e.g. `dispatchSseEvent(page, 'indexing.started', { startedAt })`).
export async function dispatchSseEvent(
  page: Page,
  eventName: string,
  payload: unknown = null,
): Promise<void> {
  await dispatchAction(page, { type: `sse/${eventName}`, payload })
}
