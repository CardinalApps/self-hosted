import {
  test,
  expect,
  loginAsGuest,
  dispatchSseEvent,
} from '@cardinalapps/e2e-helpers'

// The active-job progress bar reads from `state.jobs.activeJobProgress`,
// which is exclusively populated by the `sse/job.current_progress`
// extraReducer. Dispatching that action lets us drive the bar deterministically
// without a real running job.

test(
  'sse/job.current_progress overrides the seeded completed/total counts on a running row',
  { tag: '@journey:manage-jobs' },
  async ({ page }) => {
    const jobId = 202
    const job = {
      id: jobId,
      jobId: `job-${jobId}`,
      status: 'running',
      type: 'photo_variations',
      totalTasks: 100,
      completedTasks: 0,
      createdAt: new Date().toISOString(),
      completedAt: null,
    }
    await page.route('**/api/v1/jobs?**', async (route) => {
      const statuses = new URL(route.request().url()).searchParams.getAll('status').flatMap((s) => s.split(','))
      const active = statuses.includes('running')
      const body = JSON.stringify(active ? [[job], 1] : [[], 0])
      await route.fulfill({ status: 200, contentType: 'application/json', body })
    })

    await loginAsGuest(page)
    await page.click('a[href="/admin/jobs"]')
    await page.waitForURL((url) => url.pathname === '/admin/jobs', { timeout: 10_000 })

    const row = page.locator(`[data-testid="active-job"][data-job-id="${jobId}"]`)
    await expect(row).toBeVisible({ timeout: 10_000 })

    // Drive the in-flight progress map: `{ [jobId]: { completed, total } }`.
    await dispatchSseEvent(page, 'job.current_progress', {
      progress: {
        [jobId]: { completed: 75, total: 100 },
      },
    })

    // ProgressBar's `showCount` renders the numbers — assert "75" lands in
    // the row. Scoping to the row's testid keeps it tight.
    await expect.poll(async () => {
      return row.textContent()
    }).toMatch(/75/)
  },
)
