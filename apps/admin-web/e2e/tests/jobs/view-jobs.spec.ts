import type { Page, Route } from '@playwright/test'

import {
  test,
  expect,
  completeFirstTimeSetup,
  factoryResetMediaServer,
  loginAsGuest,
} from '@cardinalapps/e2e-helpers'

// `useGetJobsQuery` powers both the active-jobs and history cards. We mock
// the `/jobs` endpoint with `page.route` so we can render arbitrary queue
// states without doing actual server-side work.

test.beforeEach(async () => {
  await factoryResetMediaServer()
  await completeFirstTimeSetup({ serverName: 'e2e-jobs' })
})

type MockJob = {
  id: number,
  jobId: string,
  status: 'in_queue' | 'preparing' | 'running' | 'paused' | 'canceled' | 'completed' | 'errored',
  type: string,
  totalTasks: number,
  completedTasks: number,
  createdAt: string,
  completedAt: string | null,
}

const ACTIVE_STATUSES = new Set(['preparing', 'paused', 'running', 'in_queue'])
const TERMINAL_STATUSES = new Set(['canceled', 'completed', 'errored'])

// Splits a fixture list into "active" and "terminal" responses based on the
// status the request asked for, so a single fixture seeds both cards.
async function mockJobsEndpoint(page: Page, jobs: MockJob[]) {
  await page.route('**/api/v1/jobs?**', async (route: Route) => {
    const url = new URL(route.request().url())
    // `queryParams` joins arrays with commas (status=in_queue,running,paused),
    // and the server parses them with the same separator. `getAll` returns
    // the joined string as a single entry, so split it before comparing.
    const statuses = url.searchParams.getAll('status').flatMap((s) => s.split(','))
    const wantActive = statuses.some((s) => ACTIVE_STATUSES.has(s))
    const wantTerminal = statuses.some((s) => TERMINAL_STATUSES.has(s))
    const matched = jobs.filter((j) => {
      if (wantActive && ACTIVE_STATUSES.has(j.status)) return true
      if (wantTerminal && TERMINAL_STATUSES.has(j.status)) return true
      return false
    })
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([matched, matched.length]),
    })
  })
}

test(
  'empty queue renders the active-jobs empty state and no job rows',
  { tag: '@journey:manage-jobs' },
  async ({ page }) => {
    await mockJobsEndpoint(page, [])

    await loginAsGuest(page)
    await page.click('a[href="/admin/jobs"]')
    await page.waitForURL((url) => url.pathname === '/admin/jobs', { timeout: 10_000 })

    await expect(page.locator('[data-testid="active-jobs-empty"]')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('[data-testid="active-job"]')).toHaveCount(0)
  },
)

test(
  'a seeded running job renders as an active-job row with matching status attributes',
  { tag: '@journey:manage-jobs' },
  async ({ page }) => {
    const job: MockJob = {
      id: 101,
      jobId: 'job-101',
      status: 'running',
      type: 'photo_thumbnails',
      totalTasks: 50,
      completedTasks: 12,
      createdAt: new Date().toISOString(),
      completedAt: null,
    }
    await mockJobsEndpoint(page, [job])

    await loginAsGuest(page)
    await page.click('a[href="/admin/jobs"]')
    await page.waitForURL((url) => url.pathname === '/admin/jobs', { timeout: 10_000 })

    const row = page.locator('[data-testid="active-job"][data-job-id="101"]')
    await expect(row).toBeVisible({ timeout: 10_000 })
    await expect(row).toHaveAttribute('data-job-status', 'running')
    await expect(row).toHaveAttribute('data-job-type', 'photo_thumbnails')
    await expect(page.locator('[data-testid="active-jobs-empty"]')).toHaveCount(0)
  },
)
