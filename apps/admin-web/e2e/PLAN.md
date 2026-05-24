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
- `guest-login` — Sign in as the built-in Guest admin account (and disable/re-enable it)
- `local-login` — Sign in with a local-account username + password
- `view-overview` — View the overview dashboard widgets
- `change-release-channel` — Switch release channel on the server widget
- `manage-local-users` — Create / update / disable local users
- `invite-cloud-user` — Generate and manage user invitations
- `manage-roles` — View capabilities per role, assign roles to users
- `manage-libraries` — Create / configure / delete media libraries, multi-path, access control
- `deindex-media` — Wipe the indexed-media catalog via the Indexing page
- `run-indexing` — Start / pause / resume / stop an indexing run
- `view-indexing-history` — View past indexing runs and their stats
- `manage-jobs` — Observe automatic jobs; start/cancel a job manually if the UI exposes it
- `access-control-gating` — Capability-gated UI hides/disables features for under-privileged roles
- `change-app-settings` — Change theme / language / telemetry from the global settings panel

(16 new admin-feature journeys + 5 existing SSO ones = 21 total declared.)

## Key facts about the admin UI (verified via `playwright-cli` against running dev servers)

These shaped the test areas below; the implementation should treat them as load-bearing assumptions, not guesses.

- **Three login methods** at `/admin/login`: "Sign in with Cardinal Cloud" (popup, covered by existing tests), "Sign in with local account" (button — flow not yet inspected), and **"Sign in as Guest"** (clicks straight through to the dashboard).
- **Guest account is a full Administrator** local account. It can be disabled from the Users page (documented in the help app). Disabling it removes the button from `/admin/login`. Tests that just need an admin-logged-in browser should prefer guest login over the SSO popup — it's vastly faster and skips the whole Cardinal Cloud round-trip.
- **Indexing folders are NOT configured through the UI.** The `/admin/indexing` page renders the line "Folders are set in your docker-compose.yaml file." Indexing source folders and library-access groupings are two separate concepts: docker-compose owns the source paths, and `/admin/libraries` owns user-facing access scoping. Tests should not assert that the UI can add an indexing folder.
- **Library row action button is labeled "Configure"**, not "Edit". The drawer opened by it edits name / paths / access.
- **Indexing page has a "Deindex Media" button** — a destructive action that wipes the indexed catalog without rescanning. Worth its own test.
- **Jobs page describes jobs as automatic**: "Jobs run automatically when needed." Manual start may be a power-user affordance, not the primary flow. The test plan reflects this — observation tests come first, manual-start tests are secondary.
- **`/admin/setup` on a configured server renders the login form**, it does not redirect or 404. The original plan asserted a redirect; this has been corrected.

## Selector strategy — never assert on user-visible text

Every component in `apps/admin-web/src/` ships with an `i18n.json`; the app is being localized soon. **No new spec may assert against user-facing strings** — that includes `getByText`, `getByRole({ name: ... })` keyed on copy, heading-name regexes, button-name matchers, and empty-state copy matchers. Localization will silently break any such assertion.

Use these patterns instead, in roughly this order of preference:

1. **DOM IDs** — confirmed-stable IDs in this app: `#login-email`, `#login-pw`, plus whatever IDs exist on the wizard inputs (verify with `playwright-cli` before writing). When an element needs a stable selector and has no ID, add one rather than scraping text.
2. **`data-testid` attributes** — the codebase does not use these today (grep returns zero hits). When a meaningful UI element doesn't already have an ID or a uniquely-identifying class, **propose adding a `data-testid` as a testing seam** rather than reaching for copy. Adding test seams is preferable to brittle tests.
3. **Structural / class selectors** — table rows by index, drawer containers by class (e.g. `.drawer.is-open`), error alerts by container class (e.g. `.alert.error`). Reasonable when the structural shape is stable.
4. **ARIA roles by structure (not by name)** — `page.getByRole('button')` to scope a query is fine; `{ name: 'Configure' }` is not. `page.getByRole('row')` to enumerate table rows is fine; matching a row by its text contents is not.
5. **URL, localStorage, and element-shape assertions** — did the URL change to `/admin`, did `localStorage[JWT_STORAGE_KEY]` appear, did the popup close, did a known-class drawer become visible.
6. **Network-level assertions** — `page.waitForRequest` / `page.context().on('request')` / response status codes. When the meaningful behavior is "the right request fired with the right payload" or "the response was 4xx," prefer asserting on the request rather than the rendered text that resulted.

Each spec area below has been worded to comply with this rule. When implementing, if a spec needs to assert that *some* error happened and the only visible signal is copy, the right move is to (a) add a structural marker (`data-testid="error-alert"` or an `aria-invalid` attribute) to the component, or (b) assert on the network response that produced the error. **Never reach for the copy.**

The existing 8 tests under `e2e/tests/sso/` violate this rule today (e.g. `getByRole('heading', { name: /Claim This Self-Hosted App/i })`); cleaning them up is a separate ticket and out of scope for this plan.

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
  - On a server that's already set up, visiting `/admin/setup` **redirects the URL to `/admin/login`** (verified via `playwright-cli`). Assert with `page.waitForURL(/\/admin\/login$/)`, regardless of auth state. URL-based assertion is i18n-safe.
- **`factory-reset.spec.ts`** — `@journey:factory-reset`
  - From a settings/server menu (verify exact location), the owner can trigger factory reset; confirmation modal appears; confirming wipes data and redirects back to `/admin/setup`.
  - Non-owner roles do not see the factory-reset action at all.

### `login/` — non-SSO login methods *(new area)*

Architecture note: three login buttons map to **two IDPs** — Cloud SSO uses the Cardinal Cloud auth server; both "Sign in with local account" and "Sign in as Guest" are backed by the **Local IDP** on the media server. Guest is a built-in Local administrator account. Helpers should treat these as one IDP family with two UI entry points.

- **`guest-login.spec.ts`** — `@journey:guest-login`
  - Guest sign-in button on `/admin/login` (verify with `playwright-cli generate-locator` for a stable, copy-free selector; the button is the third in the login stack — likely identifiable by a `data-*` attribute or by position within the login card).
  - Clicking it lands the user at `/admin` (assert via URL), with the Guest Account row appearing on `/admin/users` (assert structurally — that one row in the users table is marked as the current user with `[data-current-user]` or equivalent — not by text).
  - Disabling the guest account from `/admin/users` removes the guest button from `/admin/login` (assert button selector resolves to zero elements after reload).
  - Re-enabling the guest account makes the button reappear.
- **`local-login.spec.ts`** — `@journey:local-login`
  - "Sign in with local account" button opens the local-auth UI — popup or inline form (verify with `playwright-cli` before writing; do not assume).
  - Correct username + password lands the user at `/admin` (URL assertion).
  - Wrong password keeps the user on the login URL and the error alert element is visible (assert by container class, not by error string).
  - Disabled local user is rejected — assert via the POST response's status code or response body shape, not the rendered error copy.

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

Reminder: libraries scope **user access**, not indexing source folders. Indexing folders are docker-compose-defined and read-only in the UI.

- **`view-libraries.spec.ts`** — `@journey:manage-libraries`
  - Empty state on a freshly-set-up server (no libraries yet).
  - Seeded libraries via `seedLibrary` render with name, path list, and allowed-user avatars.
- **`create-library.spec.ts`** — `@journey:manage-libraries`
  - Click "Create library" → drawer opens → enter name → pick a directory from the tree picker pointing at `fixturePath('music')` → save → library appears in the list and on the backend.
  - Cancel button closes the drawer without persisting.
  - Saving without selecting a path shows an error.
- **`configure-library.spec.ts`** — `@journey:manage-libraries`
  - Click the row's **Configure** button to open the configure drawer.
  - Add a second path (`fixturePath('movies')`) → backend reflects both paths.
  - Remove a path → backend has only the remaining one.
  - Change user access list → backend reflects the new allow-list.
- **`delete-library.spec.ts`** — `@journey:manage-libraries`
  - Confirmation modal appears; confirming removes the library and its row; cancelling keeps it.
- **`libraries-capability-gating.spec.ts`** — `@journey:access-control-gating`, `@journey:manage-libraries`
  - Without `Libraries.Create`: create button hidden.
  - Without `Libraries.Update`: configure drawer is read-only / disabled.
  - Without `Libraries.Delete`: delete button hidden.

### `indexing/` — library indexing *(new area)*

Reminder: source folders are docker-compose-configured and shown read-only on this page ("Folders are set in your docker-compose.yaml file."). The indexing **action** (scan / pause / stop / deindex) is in the UI; the **source paths** are not. Tests must drive the media server's docker-compose-equivalent env, or seed via `/dev/*`, to point at fixture paths.

- **`view-indexing.spec.ts`** — `@journey:run-indexing`
  - Indexing page renders with per-media-type folder rows (Music / Photos / Movies / TV), each showing the configured path or "Not set".
  - Power button is in idle state when no run is active.
  - Seeding a completed run via `seedIndexingRun` populates the history section with the right add/modify/remove counts (UI renders them as e.g. "+1,413 / ~0 / -0").
- **`run-quick-scan.spec.ts`** — `@journey:run-indexing`
  - With the Music source pointed at `fixturePath('music')`, select Quick scan + Music media-type → click power → run starts → progress widget updates → run completes → history grows by one.
  - The indexed-file count matches the number of MP3 fixtures.
- **`pause-resume-stop.spec.ts`** — `@journey:run-indexing`
  - With a long-running scan (point at a larger seeded path or use `seedIndexingRun` mid-flight), pause → status shows paused → resume → status shows running → stop → status shows stopped and a final history row is recorded.
- **`indexing-error.spec.ts`** — `@journey:run-indexing`
  - Pointing a source at a path the process cannot read surfaces the error in the progress widget and the run is recorded with status=errored.
- **`deindex-media.spec.ts`** — `@journey:deindex-media`
  - Click "Deindex Media" → confirmation modal → confirm → catalog is wiped (per-media-type counts go to 0; verify via UI and via `/dev/options` or a media-server count endpoint).
  - Cancel button keeps the catalog intact.
- **`indexing-capability-gating.spec.ts`** — `@journey:access-control-gating`, `@journey:run-indexing`, `@journey:deindex-media`
  - Without `Indexing.Read`: page is inaccessible (403 / redirect).
  - Without the destructive capability (whichever role gates Deindex — verify via the access-control library): the Deindex Media button is hidden or disabled.

### `jobs/` — background jobs *(new area)*

The Jobs page describes jobs as primarily automatic ("Jobs run automatically when needed.") The job types visible today are "Album art thumbnails", "Photo variations", "Photo thumbnails" — buttons that expand into job-type detail. Tests focus on **observation first**, then manual-control where it exists.

- **`view-jobs.spec.ts`** — `@journey:manage-jobs`
  - Empty state on a fresh server: "No active jobs." copy renders for the queue card.
  - Seeded jobs in each state render in the right section (active vs. history) with the right status badge.
- **`auto-job.spec.ts`** — `@journey:manage-jobs`
  - Trigger an action that causes the server to enqueue an automatic job (e.g. indexing photos triggers Photo thumbnails). Observe it move from queue → active → history via SSE.
  - If no UI trigger exists, seed via `seedJob` and assert the SSE-driven transitions still render correctly.
- **`manual-start-job.spec.ts`** — `@journey:manage-jobs`
  - Conditional on a manual-start affordance existing — confirm via `playwright-cli` before writing. If a job-type button opens an expander with a Start control, exercise it; if not, mark this spec as `test.skip` with a note pointing at the UI gap.
- **`pause-stop-job.spec.ts`** — `@journey:manage-jobs`
  - Conditional on the same; seed a long-running job → pause via UI → resume → stop. Each transition observable through SSE.
- **`failed-job-history.spec.ts`** — `@journey:manage-jobs`
  - Seeded errored job shows in history with the error message expanded on click.
- **`jobs-capability-gating.spec.ts`** — `@journey:access-control-gating`, `@journey:manage-jobs`
  - Without `Jobs.Create`: manual-start affordances (if present) are disabled.
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
3. **Helper expansion** — add `libraries/e2e-helpers/src/media-server.ts`, `loginAsClaimedOwner`, **and `loginAsGuest`** (prereq C). Guest login is the fastest path to an admin-logged-in browser for the bulk of admin-feature tests.
4. **`global-setup.ts` + `setup/` tests** — exercises factory-reset and the wizard, which are the foundation for everything else.
5. **`login/` (guest + local)** — small, fast, exercises the alternative login paths and unlocks the guest-login helper for downstream specs.
6. **`overview/`, `users/`, `roles/`, `libraries/`** — straightforward CRUD + capability-gating coverage.
7. **`indexing/` (incl. deindex)** — trickier because of SSE-driven progress; deindex is destructive and benefits from running after the indexing happy path.
8. **`jobs/`** — also SSE-driven; depends on `seedJob`.
9. **`settings/` + `surfaces/`** — lightest-touch coverage, last.

## Implementation tooling

`playwright-cli` (already installed at `/home/brian/.nvm/versions/node/v22.22.2/bin/playwright-cli`) and the `playwright` MCP server (registered, available after session reload) provide an **interactive browser session** that should be the first thing reached for when starting a new spec:

- `playwright-cli open http://localhost:3090/admin/login` → walk to the page the spec covers.
- `playwright-cli snapshot` → assigns refs (`e1`, `e2`, …) to every visible element, so the test author can see what's actually rendered before guessing at selectors.
- `playwright-cli generate-locator e15` → produces the exact Playwright locator (`page.getByRole('button', { name: 'Configure' })`, etc.) to bake into the spec — no string-matching guesswork.
- `playwright-cli requests` → lists every network call the page made; `request <n>` shows the exact endpoint + payload. Use this to verify API contracts the spec depends on without reading server source.
- `playwright-cli route '**/api/v1/health' --status=500` → quickly mock a backend response to discover how the UI renders an error state, before writing a test that asserts that state.
- `playwright-cli eval "el => el.id" e15` → read DOM attributes the snapshot omits (IDs, data-testid, classes).

This shortcut applies for every new spec below, but is especially valuable for: the indexing source-folder rendering (rows depend on docker-compose env), the job-type expander UI, library configure-drawer field IDs, and capability-gated affordance presence checks.

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
