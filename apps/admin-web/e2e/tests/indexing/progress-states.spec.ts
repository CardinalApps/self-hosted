import type { Page } from '@playwright/test'

import {
  test,
  expect,
  completeFirstTimeSetup,
  factoryResetMediaServer,
  loginAsGuest,
  dispatchSseEvent,
} from '@cardinalapps/e2e-helpers'

// Drives the indexing state machine via the `sse/*` Redux seam and asserts the
// UI reflects each transition. `useServerSideEvents` reduces SSE messages to
// the exact same actions we dispatch here, so the UI's reaction is identical
// to a real run — without standing up the indexer.

test.beforeEach(async ({ page }) => {
  await factoryResetMediaServer()
  await completeFirstTimeSetup({ serverName: 'e2e-indexing-states' })
  // NewRun, OverallProgress, and MediaProgress all call /index/state on
  // mount and dispatch setServerState with the response, which races our
  // SSE dispatch and resets serverState to whatever the server returned
  // (usually 'idle'). Failing the request leaves the slice at its initial
  // state — our SSE events are then the sole writer of serverState.
  await page.route('**/api/v1/index/state', (route) => route.fulfill({ status: 500, body: '' }))
})

async function gotoIndexing(page: Page) {
  await loginAsGuest(page)
  await page.click('a[href="/admin/indexing"]')
  await page.waitForURL((url: URL) => url.pathname === '/admin/indexing', { timeout: 10_000 })
  // toBeAttached rather than toBeVisible: with /index/state blocked, the
  // slice's serverState stays null so none of the conditional inner spans
  // render and the indicator is a zero-height element. We just need it
  // mounted so subsequent SSE dispatches reach a live reducer.
  await expect(page.locator('[data-testid="indexing-state-indicator"]')).toBeAttached({ timeout: 10_000 })
}

test(
  'started → paused → resumed → completed flips data-state and power-button classes',
  { tag: '@journey:run-indexing' },
  async ({ page }) => {
    await gotoIndexing(page)
    const stateIndicator = page.locator('[data-testid="indexing-state-indicator"]')
    const powerButton = page.locator('[data-testid="indexing-power-button"]')

    await dispatchSseEvent(page, 'indexing.started', { startedAt: Date.now() })
    await expect(stateIndicator).toHaveAttribute('data-state', 'indexing')
    await expect(powerButton).toHaveClass(/\brunning\b/)

    await dispatchSseEvent(page, 'indexing.paused')
    await expect(stateIndicator).toHaveAttribute('data-state', 'paused')
    await expect(powerButton).toHaveClass(/\bpaused\b/)
    await expect(page.locator('[data-testid="indexing-stop-button"]')).toBeVisible()

    await dispatchSseEvent(page, 'indexing.resumed')
    await expect(stateIndicator).toHaveAttribute('data-state', 'indexing')
    await expect(powerButton).toHaveClass(/\brunning\b/)

    await dispatchSseEvent(page, 'indexing.completed')
    await expect(stateIndicator).toHaveAttribute('data-state', 'completed')
    await expect(powerButton).not.toHaveClass(/\brunning\b/)
    await expect(powerButton).not.toHaveClass(/\bpaused\b/)
  },
)

test(
  'stopped resets the progress counters back to zero',
  { tag: '@journey:run-indexing' },
  async ({ page }) => {
    await gotoIndexing(page)

    await dispatchSseEvent(page, 'indexing.started', { startedAt: Date.now() })
    await dispatchSseEvent(page, 'indexing.current_progress', {
      state: 'indexing',
      startedAt: Date.now(),
      music: { found: 100, indexed: 30, skipped: 0, errored: 0 },
      photos: { found: 0, indexed: 0, skipped: 0, errored: 0 },
      movies: { found: 0, indexed: 0, skipped: 0, errored: 0 },
      tv: { found: 0, indexed: 0, skipped: 0, errored: 0 },
    })
    // Sanity-check that the counts landed.
    await expect.poll(async () => {
      return page.locator('[data-testid="media-progress-music"]').textContent()
    }).toMatch(/100/)

    await dispatchSseEvent(page, 'indexing.stopped')
    await expect(page.locator('[data-testid="indexing-state-indicator"]')).toHaveAttribute('data-state', 'idle')
    // After stop, the music progress bar's count should no longer include the
    // pre-stop totals — assert the "100" is gone.
    await expect.poll(async () => {
      return page.locator('[data-testid="media-progress-music"]').textContent()
    }).not.toMatch(/100/)
  },
)
