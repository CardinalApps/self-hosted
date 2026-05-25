// Catalog of main user journeys this e2e suite is meant to cover.
// Tag each Playwright test with `@journey:<id>` for one of these IDs so the
// journey-coverage reporter can show which journeys have tests.

import type { Journey } from '@cardinalapps/e2e-helpers'

// Admin-web is the in-browser admin panel for a Cardinal Media Server
// installation. It logs in via SSO against the auth IDP, which surfaces a
// different challenge set than the trusted account portal does (claim,
// authorize, must-confirm-email).
export const JOURNEYS: Journey[] = [
  { id: 'login', name: 'Log into the admin panel via Cardinal SSO' },
  { id: 'sso-login', name: 'Complete the SSO popup happy path' },
  { id: 'sso-claim-self-hosted-app', name: 'Claim an unclaimed Cardinal Media Server instance' },
  { id: 'sso-authorize-untrusted-app', name: 'Authorize a previously-claimed instance as a non-owner' },
  { id: 'sso-email-must-be-confirmed', name: 'Block login when the account email is unconfirmed' },

  // Non-SSO admin-feature journeys (covered by the new spec batches).
  { id: 'first-time-setup', name: 'Complete the first-time-setup wizard on a fresh server' },
  { id: 'factory-reset', name: 'Reset the server back to a fresh state' },
  { id: 'guest-login', name: 'Sign in as the built-in Guest admin account' },
  { id: 'local-login', name: 'Sign in with a local username + password' },
  { id: 'view-overview', name: 'View the overview dashboard widgets' },
  { id: 'change-release-channel', name: 'Switch release channel on the server widget' },
  { id: 'manage-local-users', name: 'Create / update / disable local users' },
  { id: 'invite-cloud-user', name: 'Generate and manage user invitations' },
  { id: 'manage-roles', name: 'View capabilities per role; assign roles to users' },
  { id: 'manage-libraries', name: 'Create / configure / delete media libraries' },
  { id: 'deindex-media', name: 'Wipe the indexed-media catalog via the Indexing page' },
  { id: 'run-indexing', name: 'Start / pause / resume / stop an indexing run' },
  { id: 'view-indexing-history', name: 'View past indexing runs and their stats' },
  { id: 'manage-jobs', name: 'Observe automatic jobs; start/cancel manually if exposed' },
  { id: 'access-control-gating', name: 'Capability-gated UI hides/disables features for under-privileged roles' },
  { id: 'change-app-settings', name: 'Change theme / language / telemetry from global settings' },
]
