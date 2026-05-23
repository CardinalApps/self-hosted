// Each app defines its own JOURNEYS list and tags tests with `@journey:<id>`.
// This module provides the shared shape + the tag parsing the per-app
// coverage reporter uses.

export interface Journey {
  id: string
  name: string
  description?: string
}

export const JOURNEY_TAG_PREFIX = '@journey:'

// Extracts journey IDs from a Playwright test's tag list.
export function parseJourneyTags(tags: readonly string[]): string[] {
  return tags
    .filter((t) => t.startsWith(JOURNEY_TAG_PREFIX))
    .map((t) => t.slice(JOURNEY_TAG_PREFIX.length))
}
