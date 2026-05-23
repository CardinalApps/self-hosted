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
]
