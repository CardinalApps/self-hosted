import { test as base } from '@playwright/test'
import { randomUUID } from 'node:crypto'

interface AuthFixtures {
  testEmail: string
  testPassword: string
}

// Each test gets its own unique e2e-only email and a shared known password.
// The .invalid TLD guarantees the address can never resolve to a real inbox.
export const test = base.extend<AuthFixtures>({
  // eslint-disable-next-line no-empty-pattern
  testEmail: async ({}, use) => {
    await use(`e2e-${randomUUID()}@test.invalid`)
  },
  // eslint-disable-next-line no-empty-pattern
  testPassword: async ({}, use) => {
    await use('TestPass123!')
  },
})

export { expect } from '@playwright/test'
