export type StoredApiObject = {
  queries: {
    [query: string]: unknown,
  }
}

/**
 * Deletes all of the API cache from the state object.
 */
export default function deleteApiCache(
  state: Record<string, unknown>,
) {
  if (!state || !Object.keys(state).length) {
    return
  }

  delete state['api']
}
