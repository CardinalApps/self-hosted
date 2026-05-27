import {
  test,
  expect,
  loginAsGuest,
  dispatchSseEvent,
} from '@cardinalapps/e2e-helpers'

// `sse/indexing.current_progress` carries per-media-type counters. Each
// counter feeds a separate ProgressBar — assert the music / photos rows
// reflect distinct payload slices and don't bleed into one another.

test.beforeEach(async ({ page }) => {
  // Three on-mount /index/state fetches race our SSE dispatches and can
  // overwrite the counters back to zero. Failing the request leaves the
  // slice at initial state so SSE events are the sole writer.
  await page.route('**/api/v1/index/state', (route) => route.fulfill({ status: 500, body: '' }))
})

test(
  'per-media-type counters from a current_progress event land in the right rows',
  { tag: '@journey:run-indexing' },
  async ({ page }) => {
    await loginAsGuest(page)
    await page.click('a[href="/admin/indexing"]')
    await page.waitForURL((url) => url.pathname === '/admin/indexing', { timeout: 10_000 })
    await expect(page.locator('[data-testid="media-progress-music"]')).toBeVisible({ timeout: 10_000 })

    await dispatchSseEvent(page, 'indexing.started', { startedAt: Date.now() })
    await dispatchSseEvent(page, 'indexing.current_progress', {
      state: 'indexing',
      startedAt: Date.now(),
      music:  { found: 412, indexed: 200, skipped: 5, errored: 1 },
      photos: { found: 88,  indexed: 88,  skipped: 0, errored: 0 },
      movies: { found: 0,   indexed: 0,   skipped: 0, errored: 0 },
      tv:     { found: 0,   indexed: 0,   skipped: 0, errored: 0 },
    })

    // ProgressBar with showCount renders the numeric values, so a textContent
    // check is the easiest assertion — and 412 / 200 / 88 are unique enough
    // that we can match them inside the right row's testid scope.
    await expect.poll(async () => {
      return page.locator('[data-testid="media-progress-music"]').textContent()
    }).toMatch(/412/)
    await expect.poll(async () => {
      return page.locator('[data-testid="media-progress-photos"]').textContent()
    }).toMatch(/88/)

    // Photos row must not contain music's "412" total.
    const photosText = await page.locator('[data-testid="media-progress-photos"]').textContent()
    expect(photosText ?? '').not.toMatch(/412/)
  },
)
