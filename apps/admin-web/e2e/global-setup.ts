import { ensureFirstTimeSetup } from '@cardinalapps/e2e-helpers'

/*
  Runs once before the regular admin-web Playwright suite. Idempotently
  completes first-time-setup if the media server isn't already configured —
  no factory reset, so the developer's local data survives. Specs in this
  suite seed test-unique data and clean it up in `afterEach`.

  The FTS spec suite (playwright.fts.config.ts) has its own global-setup
  that DOES factory-reset, since those specs need to drive the wizard from
  a not_setup state.

  Requires CARDINAL_ENABLE_DEV_ENDPOINTS=true on the running media server.
  If the dev routes aren't enabled, ensureFirstTimeSetup() throws and the
  suite refuses to start — silently running against a partly-configured
  server would hide real failures.
*/
export default async function globalSetup(): Promise<void> {
  await ensureFirstTimeSetup({ serverName: 'e2e-admin-web' })
}
