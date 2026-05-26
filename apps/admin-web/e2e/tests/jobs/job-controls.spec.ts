import type { Page, Route } from '@playwright/test'

import {
  test,
  expect,
  completeFirstTimeSetup,
  factoryResetMediaServer,
  loginAsGuest,
} from '@cardinalapps/e2e-helpers'

// The pause/resume/cancel controls all fire `PATCH /api/v1/job/:id` via
// `useControlActiveJobMutation`. Mock the list with a job in each status,
// click the control, assert the PATCH body.

test.beforeEach(async () => {
  await factoryResetMediaServer()
  await completeFirstTimeSetup({ serverName: 'e2e-job-controls' })
})

type MockJob = {
  id: number,
  jobId: string,
  status: 'in_queue' | 'preparing' | 'running' | 'paused',
  type: string,
  totalTasks: number,
  completedTasks: number,
  createdAt: string,
  completedAt: string | null,
}

function jobWithStatus(id: number, status: MockJob['status']): MockJob {
  return {
    id,
    jobId: `job-${id}`,
    status,
    type: 'album_art_thumbnails',
    totalTasks: 10,
    completedTasks: 3,
    createdAt: new Date().toISOString(),
    completedAt: null,
  }
}

async function mockSingleJob(page: Page, job: MockJob) {
  await page.route('**/api/v1/jobs?**', async (route: Route) => {
    // Status arrays are comma-joined by `queryParams` on the way out and
    // re-split on the way in by `ParseArrayPipe`; split them ourselves here.
    const statuses = new URL(route.request().url()).searchParams.getAll('status').flatMap((s) => s.split(','))
    const wantActive = statuses.some((s) => ['preparing', 'paused', 'running', 'in_queue'].includes(s))
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(wantActive ? [[job], 1] : [[], 0]),
    })
  })
  // PATCH succeeds with the same job shape echoed back; the actual handler
  // would mutate state but for the test we just need a 200.
  await page.route(`**/api/v1/job/${job.id}`, async (route: Route) => {
    if (route.request().method() !== 'PATCH') return route.continue()
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(job) })
  })
}

async function gotoJobs(page: Page) {
  await loginAsGuest(page)
  await page.click('a[href="/admin/jobs"]')
  await page.waitForURL((url: URL) => url.pathname === '/admin/jobs', { timeout: 10_000 })
}

test(
  'pause control on a running job PATCHes /job/:id with status=paused',
  { tag: '@journey:manage-jobs' },
  async ({ page }) => {
    const job = jobWithStatus(301, 'running')
    await mockSingleJob(page, job)
    await gotoJobs(page)

    const row = page.locator(`[data-testid="active-job"][data-job-id="${job.id}"]`)
    await expect(row).toBeVisible({ timeout: 10_000 })

    const patchPromise = page.waitForRequest(
      (r) => r.url().endsWith(`/api/v1/job/${job.id}`) && r.method() === 'PATCH',
      { timeout: 10_000 },
    )
    await row.locator('[data-testid="active-job-pause"]').click()
    const req = await patchPromise
    expect((req.postDataJSON() as { status?: string }).status).toBe('paused')
  },
)

test(
  'resume control on a paused job PATCHes status=running',
  { tag: '@journey:manage-jobs' },
  async ({ page }) => {
    const job = jobWithStatus(302, 'paused')
    await mockSingleJob(page, job)
    await gotoJobs(page)

    const row = page.locator(`[data-testid="active-job"][data-job-id="${job.id}"]`)
    await expect(row).toBeVisible({ timeout: 10_000 })

    const patchPromise = page.waitForRequest(
      (r) => r.url().endsWith(`/api/v1/job/${job.id}`) && r.method() === 'PATCH',
      { timeout: 10_000 },
    )
    await row.locator('[data-testid="active-job-resume"]').click()
    const req = await patchPromise
    expect((req.postDataJSON() as { status?: string }).status).toBe('running')
  },
)

test(
  'cancel control on a paused job PATCHes status=canceled',
  { tag: '@journey:manage-jobs' },
  async ({ page }) => {
    const job = jobWithStatus(303, 'paused')
    await mockSingleJob(page, job)
    await gotoJobs(page)

    const row = page.locator(`[data-testid="active-job"][data-job-id="${job.id}"]`)
    await expect(row).toBeVisible({ timeout: 10_000 })

    const patchPromise = page.waitForRequest(
      (r) => r.url().endsWith(`/api/v1/job/${job.id}`) && r.method() === 'PATCH',
      { timeout: 10_000 },
    )
    await row.locator('[data-testid="active-job-cancel"]').click()
    const req = await patchPromise
    expect((req.postDataJSON() as { status?: string }).status).toBe('canceled')
  },
)
