import { ensureFirstTimeSetup } from '@cardinalapps/e2e-helpers'

/*
  Runs once before the photos-web Playwright suite. Idempotently completes
  first-time-setup if the media server isn't already configured — no factory
  reset, so the developer's local data survives.

  Requires CARDINAL_ENABLE_DEV_ENDPOINTS=true on the media server running at
  http://localhost:3080. If the dev routes aren't enabled, ensureFirstTimeSetup()
  throws and the suite refuses to start rather than running against a
  partly-configured server.
*/
export default async function globalSetup(): Promise<void> {
  await ensureFirstTimeSetup({ serverName: 'e2e-photos-web' })
}
