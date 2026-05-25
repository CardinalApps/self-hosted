import { factoryResetMediaServer } from '@cardinalapps/e2e-helpers'

/*
  Runs once before the admin-web Playwright suite. Drops whatever state the
  previous run (or developer hands) left on the media server, so the wizard,
  user table, libraries, etc. all start from the same baseline.

  Per-test isolation still resets the bits each spec cares about — this is
  just defense-in-depth against drift across runs.

  Requires CARDINAL_ENABLE_DEV_ENDPOINTS=true on the running media server.
  If the dev routes aren't enabled, factoryResetMediaServer() throws and the
  suite refuses to start — that's intentional: silently running against a
  partly-configured server hides real failures.
*/
export default async function globalSetup(): Promise<void> {
  await factoryResetMediaServer()
}
