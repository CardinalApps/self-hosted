import type { Page } from '@playwright/test'

import {
  test,
  expect,
  loginAsGuest,
} from '@cardinalapps/e2e-helpers'

// Deindex Media wipes the indexed catalog (POST /api/v1/reset with type=media
// and validationString="Deindex media"). We assert on the network call rather
// than UI copy — both are i18n-safe.

async function openDeindexConfirm(page: Page) {
  await loginAsGuest(page)
  await page.click('a[href="/admin/indexing"]')
  await page.waitForURL((url: URL) => url.pathname === '/admin/indexing', { timeout: 10_000 })
  await page.click('[data-testid="deindex-media-button"]')
  await expect(page.locator('[data-testid="confirm-input"]')).toBeVisible({ timeout: 5_000 })
}

test(
  'confirming sends POST /reset with type=media and the validation string',
  { tag: '@journey:deindex-media' },
  async ({ page }) => {
    await openDeindexConfirm(page)

    const resetPromise = page.waitForRequest(
      (req) => req.url().endsWith('/api/v1/reset') && req.method() === 'POST',
      { timeout: 10_000 },
    )

    // TextInput spreads its props onto the inner <input>, so the testid lands
    // directly on the input element — no descendant selector needed.
    await page.fill('[data-testid="confirm-input"]', 'Deindex media')
    await page.click('[data-testid="confirm-confirm"]')

    const req = await resetPromise
    const body = req.postDataJSON() as { type?: string, validationString?: string }
    expect(body.type).toBe('media')
    expect(body.validationString).toBe('Deindex media')
  },
)

test(
  'cancelling closes the modal without firing /reset',
  { tag: '@journey:deindex-media' },
  async ({ page }) => {
    await openDeindexConfirm(page)

    let resetRequested = false
    page.on('request', (req) => {
      if (req.url().endsWith('/api/v1/reset') && req.method() === 'POST') {
        resetRequested = true
      }
    })

    await page.click('[data-testid="confirm-cancel"]')
    await expect(page.locator('[data-testid="confirm-input"]')).toHaveCount(0, { timeout: 5_000 })
    expect(resetRequested).toBe(false)
  },
)
