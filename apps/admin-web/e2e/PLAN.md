# E2E backfill — admin-web

## Context

`admin-web` is the management UI for a self-hosted Cardinal media server. It runs on port 3090 (Vite dev), is served under `/admin/*` in production by the media server, and talks to the media server REST API at `http://localhost:3080/api/v1` plus the Cardinal Cloud auth server at `http://127.0.0.1:4013` for SSO login. Login is always via Cardinal Cloud SSO (popup); after login, capability-gated screens render under `/admin/`.

Today the app has **8 e2e tests across 3 files**, all in `e2e/tests/sso/`, covering only the SSO entry-point challenges (`claim-self-hosted-app`, `authorize-untrusted-app`, `email-must-be-confirmed`). **Zero tests exist for the actual admin features** — users, roles, libraries, indexing, jobs, first-time setup, overview, settings. Closing that gap is the goal of this plan.

`admin-web/e2e/journeys.ts` declares 5 journeys, all on the SSO entry-point. The bulk of the work below is **defining new admin-feature journeys**, then writing one or more tests per journey, in the same style as `account-web` (real backend, `@cardinalapps/e2e-helpers` fixtures, journey-tagged tests, `/dev/*` endpoint-driven seeding, cleanup in `finally`).

This plan also touches the **media server** (`servers/media`) — it must grow its own `/dev/*` test endpoints (mirroring the auth server's pattern), and `tests/fixtures/` must grow beyond the current music-only sample to include movies, TV, and photos.

## Existing coverage (do not duplicate)

| Journey | Tests |
|---|---|
| `@journey:sso-login` | covered indirectly in all 3 files |
| `@journey:sso-claim-self-hosted-app` | `claim-self-hosted-app.spec.ts` (3 tests) |
| `@journey:sso-authorize-untrusted-app` | `authorize-untrusted-app.spec.ts` (3 tests) |
| `@journey:sso-email-must-be-confirmed` | `email-must-be-confirmed.spec.ts` (2 tests) |
| `@journey:login` | tagged on each test above |

## New journeys to declare

Add to `apps/admin-web/e2e/journeys.ts`:

- `first-time-setup` — Complete the first-time setup wizard on a fresh server
- `factory-reset` — Reset the server back to a fresh state
- `view-overview` — View the overview dashboard widgets
- `change-release-channel` — Switch release channel on the server widget
- `manage-local-users` — Create / update / disable local users
- `invite-cloud-user` — Generate and manage user invitations
- `manage-roles` — View capabilities per role, assign roles to users
- `manage-libraries` — Create / edit / delete media libraries, multi-path
- `run-indexing` — Start / pause / resume / stop an indexing run
- `view-indexing-history` — View past indexing runs and their stats
- `start-job` — Start a background job from the Jobs page
- `manage-jobs` — Pause / resume / stop a running job; view history
- `access-control-gating` — Capability-gated UI hides/disables features for under-privileged roles
- `change-app-settings` — Change theme / language / telemetry from the global settings panel

(15 new admin-feature journeys + 5 existing SSO ones = 20 total declared.)

## Required prereqs

### A. Media-server `/dev/*` test endpoints *(new)*

The media server has no test-mode endpoints today. Mirror the auth server's pattern (`/dev/*` routes, gated by `NODE_ENV !== 'production'` or an explicit env flag like `CARDINAL_ENABLE_DEV_ENDPOINTS=true`) and add:

| Endpoint | Purpose |
|---|---|
| `POST /dev/factory-reset` | Resets the server to factory state (wraps the existing `factoryReset` function in `app.service.ts`). Used as global setup or in per-test reset hooks. |
| `POST /dev/first-time-setup` | Body: `{ serverName, ownerJwt }`. Completes first-time setup non-interactively so tests that aren't about the wizard don't have to walk through it. |
| `POST /dev/users/local` | Body: `{ username, password, role }`. Creates a local user with a given role. Returns `{ id, jwt }`. |
| `POST /dev/users/grant-role` | Body: `{ userId, role }`. Grants a role to any user (cloud or local). |
| `POST /dev/users/revoke-role` | Body: `{ userId, role }`. |
| `POST /dev/libraries` | Body: `{ name, paths[], allowedUserIds[] }`. Inserts a library row directly. |
| `DELETE /dev/libraries/:id` | Removes a library. |
| `POST /dev/indexing/seed-run` | Body: `{ status, stats, mediaTypes[] }`. Seeds an indexing run in any state (running, paused, completed, errored) so history/progress UI can be asserted deterministically. |
| `POST /dev/jobs/seed` | Body: `{ type, status, progress }`. Seeds a job row in any state. |
| `GET /dev/options/:name` | Returns a server option value. Used to assert e.g. `first_time_setup_done` from tests. |

Gate all of these behind the same env flag and document them in `servers/media/README.md`.

### B. Media-server fixtures *(extend)*

`servers/media/tests/fixtures/` today only has music sample MP3s. The admin features under test need more variety. Add:

```
servers/media/tests/fixtures/
├── music/                    (exists)
├── movies/                   (new)
│   ├── Sample Movie (2020)/Sample Movie (2020).mp4
│   └── Another Movie (2019)/Another Movie (2019).mp4
├── tv/                       (new)
│   └── Sample Show/Season 01/Sample Show - S01E01.mp4
├── photos/                   (new)
│   ├── 2024-01-01.jpg
│   └── 2024-02-15.png
└── empty/                    (new — for testing an empty library path)
```

Use tiny synthetic media (≤100 KB each) — they only need to be valid containers for the indexer's probe step, not real content. A `README.md` in the fixtures dir should list what each subdir is for and which tests consume it.

### C. New helpers in `@cardinalapps/e2e-helpers`

Mirror the auth-server helper pattern. All target `http://localhost:3080`.

| Helper | Purpose |
|---|---|
| `factoryResetMediaServer()` | `POST /dev/factory-reset`. Use in `beforeAll` or `beforeEach` for tests that need a clean state. |
| `completeFirstTimeSetup({ serverName, ownerJwt })` | `POST /dev/first-time-setup`. Skips the wizard for tests that don't exercise it. |
| `seedLocalUser({ username, password, role })` → `{ id, jwt }` | `POST /dev/users/local`. |
| `grantRole(userId, role)` / `revokeRole(userId, role)` | Role manipulation. |
| `seedLibrary({ name, paths, allowedUserIds })` → `{ id }` | `POST /dev/libraries`. Use fixture paths from `servers/media/tests/fixtures/*`. |
| `seedIndexingRun({ status, stats, mediaTypes })` | `POST /dev/indexing/seed-run`. |
| `seedJob({ type, status, progress })` → `{ id }` | `POST /dev/jobs/seed`. |
| `getMediaServerOption(name)` → value | `GET /dev/options/:name`. |
| `loginAsClaimedOwner(page, { jwt, instanceId, serverName })` | One-shot: mock instance, complete SSO popup with the given JWT, land on `/admin/`. Most admin-feature specs start here. |
| `loginAsLocalUser(page, { username, password })` | Drive the local-user login popup branch (separate from cloud SSO). |
| `fixturePath(rel)` → absolute path | Resolves `servers/media/tests/fixtures/<rel>` to an absolute path the directory picker can ingest. Lives near the helpers; absolute paths needed because the media server scans local disk. |

Add a `media-server.ts` file alongside `api.ts` and `sso.ts` in `libraries/e2e-helpers/src/`.

### D. Playwright config tweak

`apps/admin-web/e2e/playwright.config.ts` currently has no `globalSetup`. Add one (`e2e/global-setup.ts`) that runs `factoryResetMediaServer()` once before the suite — covers the "leaked state from prior runs" failure mode and lets tests assume a clean baseline. Each test that mutates server-wide state (setup, factory-reset, library config) still resets at the start of the test for isolation.

## Test plan by feature area

Path convention: `apps/admin-web/e2e/tests/<area>/<file>.spec.ts`.

### `setup/` — first-time setup wizard *(new area)*

- **`first-time-setup.spec.ts`** — `@journey:first-time-setup`
  - Happy path: factory-reset → navigate to `/admin/` → wizard launches → step through Welcome → Theme → Server Name → SSO login → Usage Data → Privacy → Help → Finish → `first_time_setup_done` option flips to `true`, owner is the SSO user, redirected to `/admin/`.
  - Submitting an empty server name keeps the user on the server-name step with a validation error.
  - Cancelling SSO mid-wizard (closing the popup) returns the wizard to the login step without losing earlier input.
  - Reloading the page in the middle of the wizard restarts from step 1 (or resumes — match whatever the UI does; assert that behavior).
- **`first-time-setup-skipped-when-done.spec.ts`** — `@journey:first-time-setup`
  - On a server that's already set up, visiting `/admin/setup` redirects to `/admin/` (or 404).
- **`factory-reset.spec.ts`** — `@journey:factory-reset`
  - From a settings/server menu (verify exact location), the owner can trigger factory reset; confirmation modal appears; confirming wipes data and redirects back to `/admin/setup`.
  - Non-owner roles do not see the factory-reset action at all.

### `overview/` — dashboard *(new area)*

- **`overview-widgets.spec.ts`** — `@journey:view-overview`
  - Server widget shows version, instance name, release channel selector.
  - Active users widget reflects seeded user count (seed 3 users via `seedLocalUser`).
  - Apps widget renders without errors when no third-party apps are running.
  - Reload button refetches and the widgets re-render.
- **`release-channel.spec.ts`** — `@journey:change-release-channel`
  - Changing the release channel dropdown calls the backend and persists across reload.
  - "Check for updates" button issues the update-check request and surfaces the result (mock the response to assert both "up-to-date" and "update available" UI states).

### `users/` — local users & invitations *(new area)*

- **`view-users.spec.ts`** — `@journey:manage-local-users`
  - Users table renders the owner row with a "you" indicator and the correct role.
  - Seeding 5 additional users via the helper populates the table; cloud vs. local type is shown correctly.
  - Empty state when (artificially) only the owner exists.
- **`create-local-user.spec.ts`** — `@journey:manage-local-users`
  - Owner creates a local user via the drawer → user appears in the table → can log in via local-auth popup (`loginAsLocalUser`).
  - Submitting with a duplicate username shows an error and keeps the drawer open.
  - Submitting with a too-weak password shows an error (assert whatever the server enforces).
- **`update-local-user.spec.ts`** — `@journey:manage-local-users`
  - Update password → user can log in with new password, fails with old.
  - Disable user → user's next login attempt is rejected and the row shows "disabled".
  - Re-enable user → login works again.
- **`invite-cloud-user.spec.ts`** — `@journey:invite-cloud-user`
  - Owner generates an invite → invite appears in the active-invitations list → the link contains an invite token.
  - Consuming the invite token (via a second browser context simulating the invitee) registers the user against the server.
  - Revoking an active invitation removes it from the list and the token becomes invalid.
- **`users-capability-gating.spec.ts`** — `@journey:access-control-gating`, `@journey:manage-local-users`
  - User without `Users.Create`: cannot see/click the create-user button.
  - User without `Users.Update`: cannot edit other users; drawer either hidden or read-only.
  - User with only `Users.Read`: can view the table but no mutation affordances are present.

### `roles/` — roles & capabilities *(new area)*

- **`view-roles.spec.ts`** — `@journey:manage-roles`
  - Roles page lists all system roles with their descriptions.
  - Clicking a role reveals its capability list; matches the access-control library definitions.
- **`assign-roles.spec.ts`** — `@journey:manage-roles`
  - Assigning a role to a user (via the user drawer or roles UI — match where the UI does it) persists; reloading shows the role on the user row.
  - Revoking a role removes it.
  - Cannot remove the owner role from the owner (last-owner guard; verify the UI prevents or the API rejects).

### `libraries/` — media library configuration *(new area)*

- **`view-libraries.spec.ts`** — `@journey:manage-libraries`
  - Empty state on a freshly-set-up server (no libraries yet).
  - Seeded libraries via `seedLibrary` render with name, path list, and allowed-user avatars.
- **`create-library.spec.ts`** — `@journey:manage-libraries`
  - Open create-library drawer → enter name → pick a directory from the tree picker pointing at `fixturePath('music')` → save → library appears in the list and on the backend.
  - Cancel button closes the drawer without persisting.
  - Saving without selecting a path shows an error.
- **`edit-library.spec.ts`** — `@journey:manage-libraries`
  - Add a second path to a library (`fixturePath('movies')`) → backend reflects both paths.
  - Remove a path → backend has only the remaining one.
  - Change user access list → backend reflects the new allow-list.
- **`delete-library.spec.ts`** — `@journey:manage-libraries`
  - Confirmation modal appears; confirming removes the library and its row; cancelling keeps it.
- **`libraries-capability-gating.spec.ts`** — `@journey:access-control-gating`, `@journey:manage-libraries`
  - Without `Libraries.Create`: create button hidden.
  - Without `Libraries.Update`: edit drawer is read-only / disabled.
  - Without `Libraries.Delete`: delete button hidden.

### `indexing/` — library indexing *(new area)*

- **`view-indexing.spec.ts`** — `@journey:run-indexing`
  - Indexing page renders with the power button in idle state when no run is active.
  - Seeding a completed run via `seedIndexingRun` populates the history section.
- **`run-quick-scan.spec.ts`** — `@journey:run-indexing`
  - With a library pointing at `fixturePath('music')`, select Quick scan + Music media-type → click power → run starts → progress widget updates → run completes → history grows by one.
  - The indexed-file count matches the number of MP3 fixtures.
- **`pause-resume-stop.spec.ts`** — `@journey:run-indexing`
  - With a long-running scan (point at a larger seeded path or use `seedIndexingRun` mid-flight), pause → status shows paused → resume → status shows running → stop → status shows stopped and a final history row is recorded.
- **`indexing-error.spec.ts`** — `@journey:run-indexing`
  - Indexing a library that points at a path the process cannot read surfaces the error in the progress widget and the run is recorded with status=errored.
- **`indexing-capability-gating.spec.ts`** — `@journey:access-control-gating`, `@journey:run-indexing`
  - Without `Indexing.Read`: page is inaccessible (403 / redirect).

### `jobs/` — background jobs *(new area)*

- **`view-jobs.spec.ts`** — `@journey:start-job`, `@journey:manage-jobs`
  - Empty state on a fresh server (no jobs).
  - Seeded jobs in each state render in the right section (active vs. history) with the right status badge.
- **`start-job.spec.ts`** — `@journey:start-job`
  - Open a job type → click Start → job appears in the active list → SSE event drives the progress bar to completion → job moves to history with status=completed.
- **`pause-stop-job.spec.ts`** — `@journey:manage-jobs`
  - Start a long-running job (seeded if needed) → pause → status updates via SSE → resume → status updates → stop → job ends in history with status=canceled.
- **`failed-job-history.spec.ts`** — `@journey:manage-jobs`
  - Seeded errored job shows in history with the error message expanded on click.
- **`jobs-capability-gating.spec.ts`** — `@journey:access-control-gating`, `@journey:start-job`
  - Without `Jobs.Create`: start buttons are disabled, job-type expand reveals read-only info.
  - Without `Jobs.Read`: page is inaccessible.

### `settings/` — global app settings *(new area)*

- **`app-settings.spec.ts`** — `@journey:change-app-settings`
  - Toggle theme → persists in localStorage → reloads with the same theme.
  - Change language → UI strings update; persists across reload.
  - Toggle telemetry → backend reflects the new value (assert via `getMediaServerOption('telemetry_opt_in')` or similar).

### `surfaces/` — error pages and access denial *(new area)*

- **`access-denied.spec.ts`** — `@journey:access-control-gating`
  - A user with no capabilities visiting `/admin/users` directly lands on a 403 / access-denied page (not a blank screen).
- **`media-server-offline.spec.ts`** — *no journey tag*
  - `page.route('**/api/v1/**', r => r.abort())` then reload → app renders an offline / connection-error state (matches AppBase's error handling).
- **`unknown-route.spec.ts`** — *no journey tag*
  - Visiting `/admin/does-not-exist` renders the 404 page.

### `sso/` — existing area, do not modify

The 8 existing tests stay as-is. They cover all 4 SSO entry-point journeys and are the closest thing to a "happy path" the app currently has.

## Files to be created or modified

**New (admin-web):**
- `apps/admin-web/e2e/global-setup.ts`
- `apps/admin-web/e2e/tests/setup/first-time-setup.spec.ts`
- `apps/admin-web/e2e/tests/setup/first-time-setup-skipped-when-done.spec.ts`
- `apps/admin-web/e2e/tests/setup/factory-reset.spec.ts`
- `apps/admin-web/e2e/tests/overview/overview-widgets.spec.ts`
- `apps/admin-web/e2e/tests/overview/release-channel.spec.ts`
- `apps/admin-web/e2e/tests/users/view-users.spec.ts`
- `apps/admin-web/e2e/tests/users/create-local-user.spec.ts`
- `apps/admin-web/e2e/tests/users/update-local-user.spec.ts`
- `apps/admin-web/e2e/tests/users/invite-cloud-user.spec.ts`
- `apps/admin-web/e2e/tests/users/users-capability-gating.spec.ts`
- `apps/admin-web/e2e/tests/roles/view-roles.spec.ts`
- `apps/admin-web/e2e/tests/roles/assign-roles.spec.ts`
- `apps/admin-web/e2e/tests/libraries/view-libraries.spec.ts`
- `apps/admin-web/e2e/tests/libraries/create-library.spec.ts`
- `apps/admin-web/e2e/tests/libraries/edit-library.spec.ts`
- `apps/admin-web/e2e/tests/libraries/delete-library.spec.ts`
- `apps/admin-web/e2e/tests/libraries/libraries-capability-gating.spec.ts`
- `apps/admin-web/e2e/tests/indexing/view-indexing.spec.ts`
- `apps/admin-web/e2e/tests/indexing/run-quick-scan.spec.ts`
- `apps/admin-web/e2e/tests/indexing/pause-resume-stop.spec.ts`
- `apps/admin-web/e2e/tests/indexing/indexing-error.spec.ts`
- `apps/admin-web/e2e/tests/indexing/indexing-capability-gating.spec.ts`
- `apps/admin-web/e2e/tests/jobs/view-jobs.spec.ts`
- `apps/admin-web/e2e/tests/jobs/start-job.spec.ts`
- `apps/admin-web/e2e/tests/jobs/pause-stop-job.spec.ts`
- `apps/admin-web/e2e/tests/jobs/failed-job-history.spec.ts`
- `apps/admin-web/e2e/tests/jobs/jobs-capability-gating.spec.ts`
- `apps/admin-web/e2e/tests/settings/app-settings.spec.ts`
- `apps/admin-web/e2e/tests/surfaces/access-denied.spec.ts`
- `apps/admin-web/e2e/tests/surfaces/media-server-offline.spec.ts`
- `apps/admin-web/e2e/tests/surfaces/unknown-route.spec.ts`

**New (media server):**
- `servers/media/src/modules/dev/` (new module) — controllers and providers for the 10 `/dev/*` endpoints listed in prereq A, gated by `CARDINAL_ENABLE_DEV_ENDPOINTS=true`
- `servers/media/tests/fixtures/movies/Sample Movie (2020)/Sample Movie (2020).mp4`
- `servers/media/tests/fixtures/movies/Another Movie (2019)/Another Movie (2019).mp4`
- `servers/media/tests/fixtures/tv/Sample Show/Season 01/Sample Show - S01E01.mp4`
- `servers/media/tests/fixtures/photos/2024-01-01.jpg`
- `servers/media/tests/fixtures/photos/2024-02-15.png`
- `servers/media/tests/fixtures/empty/.gitkeep`
- `servers/media/tests/fixtures/README.md` — explains the fixture layout and which tests consume each subdir

**New (e2e-helpers):**
- `libraries/e2e-helpers/src/media-server.ts` — implements all helpers from prereq C

**Updated:**
- `apps/admin-web/e2e/journeys.ts` — add the 15 new journey IDs
- `apps/admin-web/e2e/playwright.config.ts` — register `global-setup.ts`
- `libraries/e2e-helpers/src/index.ts` — re-export the new media-server helpers
- `servers/media/README.md` — document the `/dev/*` endpoints and the `CARDINAL_ENABLE_DEV_ENDPOINTS` flag

## Implementation order (suggested)

1. **Media-server `/dev/*` endpoints** — without these, every authenticated admin test has to walk through the entire first-time-setup wizard. Land prereq A first as its own PR.
2. **Fixture expansion** — add the movies/TV/photos/empty subdirs (prereq B) so library + indexing tests have content to point at.
3. **Helper expansion** — add `libraries/e2e-helpers/src/media-server.ts` and `loginAsClaimedOwner` (prereq C).
4. **`global-setup.ts` + `setup/` tests** — exercises factory-reset and the wizard, which are the foundation for everything else.
5. **`overview/`, `users/`, `roles/`, `libraries/`** — straightforward CRUD + capability-gating coverage.
6. **`indexing/`** — depends on libraries existing and on `seedIndexingRun`; trickier because of SSE.
7. **`jobs/`** — also SSE-driven; depends on `seedJob`.
8. **`settings/` + `surfaces/`** — lightest-touch coverage, last.

## Verification

- After the media-server dev-endpoints land: `pnpm --filter @cardinalapps/cardinal-media start` (or whatever the dev command is) with `CARDINAL_ENABLE_DEV_ENDPOINTS=true`, then `curl -X POST http://localhost:3080/dev/factory-reset` should reset the server.
- Run new tests as they land: `pnpm --filter @cardinalapps/admin-web test:e2e -- --grep "<file>"`.
- Full suite: `pnpm --filter @cardinalapps/admin-web test:e2e` with media server (port 3080), admin-web dev (port 3090), and auth server (`127.0.0.1:4013`, `DISABLE_RATE_LIMIT=true`) all running.
- Check `apps/admin-web/e2e/test-results/journey-coverage.json` — every declared journey in `journeys.ts` should have at least one `[x]` row.
- For helpers added to `e2e-helpers`, build the package to make sure the new exports compile.
- After a full run, factory-reset the media server before any manual usage — tests will leave the server in whatever state the last test produced.

## Known unknowns (resolve during implementation)

- **Local-auth login popup**: the existing helpers only drive the cloud-SSO popup. `loginAsLocalUser` may need to interact with a different popup component or with a non-popup form — verify what `/admin/login` actually renders when local users are present.
- **SSE wiring**: jobs/indexing progress comes through SSE channels. Playwright can observe these via `page.waitForResponse` or by asserting on the DOM state they drive. Pick the simpler approach per test; don't try to assert raw SSE frames unless something forces it.
- **Capability seeding**: granting/revoking capabilities may require constructing role payloads from the access-control library; the helper should accept role *names* and resolve to capability lists internally so tests stay readable.
- **First-time-setup teardown**: factory-reset between tests is needed to re-run the wizard test. Decide whether this is per-test (slow but isolated) or once-per-suite with the wizard test running first (fast but order-dependent). Default to per-test isolation; revisit only if runtime becomes a problem.
- **Update-check assertion**: the release-channel test mocks the update-check response. If the backend reaches a real upstream service in dev, the mock will need to intercept that fetch — verify the request path before writing the test.
