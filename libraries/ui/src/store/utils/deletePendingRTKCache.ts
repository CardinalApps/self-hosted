export type StoredApiObject = {
  queries: {
    [query: string]: {
      status: string,
    }
  }
}

/**
 * Finds and deletes any RTK Query cache that is in a "pending" state.
 * 
 * When caching the store on every change, it's possible for the RTK Query
 * requests to get cached and stuck in a "pending" state. When the component is
 * remounted, RTK Query will not refetch because it, and the manual refetch()
 * function doesn't work either.
 * 
 * This mutates the input object.
 */
export default function deletePendingRTKQueryCache(
  state: Record<string, unknown>,
  matcher: string = 'Api',
) {
  if (!state || !Object.keys(state).length) {
    return
  }

  for (const [key] of Object.entries(state)) {
    if (key.includes(matcher) || key === 'api') {
      const matched = state[key] as StoredApiObject
      if (Object.keys(matched?.queries).length) {
        for (const [queryName, queryCache] of Object.entries(matched.queries)) {
          if (queryCache?.status === 'pending') {
            delete state[key]['queries'][queryName]['status']
          }
        }
      }
    }
  }
}
