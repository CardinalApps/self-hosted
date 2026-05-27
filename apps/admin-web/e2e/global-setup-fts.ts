import { factoryResetMediaServer } from '@cardinalapps/e2e-helpers'

/*
  Runs once before the FTS-only Playwright suite. Wipes the media server
  back to not_setup so the wizard specs can drive the flow from the start.

  Per-spec isolation still runs another factory reset inside each spec — this
  is just defense-in-depth against drift between runs.

  Requires CARDINAL_ENABLE_DEV_ENDPOINTS=true on the running media server.
*/
export default async function globalSetup(): Promise<void> {
  await factoryResetMediaServer()
}
