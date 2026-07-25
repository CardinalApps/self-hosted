import {
  test,
  expect,
} from '@cardinalapps/e2e-helpers'

import type { Page } from '@playwright/test'

/*
  Custom themes are user-scoped settings stored on the Media Server, not in the
  browser, so a theme built in one Cardinal app has to show up in every other
  app that same account signs into.

  admin-web and music-web run on separate origins in dev (:3090 and :3094), so
  they get separate localStorage. That's the point: the only way the theme can
  cross is through the server. Requires the music-web dev server to be running
  alongside admin-web's.
*/

const MUSIC_APP_URL = process.env.MUSIC_WEB_URL || 'http://localhost:3094'

// Names the theme after the test run so a stale theme can never satisfy the assertion
const themeName = (): string => `E2E ${Date.now().toString().slice(-8)}`

// Sign in with the built-in Guest account, the fastest route to a logged-in app
async function loginAsGuest(page: Page, loginUrl: string, appPath: string): Promise<void> {
  await page.goto(loginUrl)
  const guestButton = page.locator('[data-testid="login-with-guest-button"]')
  await expect(guestButton).toBeVisible({ timeout: 15_000 })
  await guestButton.click()
  await page.waitForURL((url) => url.pathname.replace(/\/$/, '') === appPath, { timeout: 15_000 })
}

// Open the settings panel from the user menu and switch to the Theme tab
async function openThemeTab(page: Page): Promise<void> {
  await page.click('[data-testid="user-menu-avatar"]')
  await page.click('[data-testid="user-menu-settings"]')
  await page.click('[data-testid="settings-tab-theme"]')
  await expect(page.locator('.theme-editor')).toBeVisible({ timeout: 10_000 })
}

test(
  'a custom theme created in admin-web shows up in music-web for the same account',
  { tag: '@journey:cross-app-custom-theme' },
  async ({ page }) => {
    const name = themeName()

    // --- Create the theme in the admin app ---
    await loginAsGuest(page, '/admin/login', '/admin')
    await openThemeTab(page)

    // Editor writes are debounced before they hit the server, so each one is awaited in turn -
    // otherwise the duplicate's PATCH could satisfy the wait meant for the rename's.
    const settingsSaved = () => page.waitForResponse((res) =>
      res.url().includes('/settings') && res.request().method() === 'PATCH' && res.ok(),
      { timeout: 15_000 })

    // Duplicating the active built-in theme is the shortest way to a custom theme
    const duplicateSaved = settingsSaved()
    await page.click('[data-testid="theme-duplicate"]')
    await duplicateSaved

    await page.click('[data-testid="theme-rename"]')
    const renameInput = page.locator('[data-testid="theme-rename-input"]')
    await expect(renameInput).toBeVisible()
    await renameInput.fill(name)

    const renameSaved = settingsSaved()
    await page.click('[data-testid="theme-rename-save"]')
    await renameSaved

    const themeSelect = page.locator('.theme-editor-header .custom-select[data-name="theme"]')
    await expect(themeSelect).toContainText(name)

    // --- Find it in the music app ---
    await loginAsGuest(page, `${MUSIC_APP_URL}/music/login`, '/music')
    await openThemeTab(page)

    const musicThemeSelect = page.locator('.theme-editor-header .custom-select[data-name="theme"]')

    // It is offered as a choice...
    await musicThemeSelect.locator('.typing-area').click()
    await expect(musicThemeSelect.locator('.option', { hasText: name }))
      .toBeVisible({ timeout: 15_000 })

    // ...and the account's selection followed it over, since that is user-scoped too
    await expect(musicThemeSelect).toContainText(name)
  },
)
