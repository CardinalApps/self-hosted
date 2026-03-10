export type StoredApiObject = {
  queries: {
    [query: string]: unknown,
  }
}

/**
 * Finds and deletes any RTK Query cache for infinite queries.
 * 
 * This mutates the input object.
 */
export default function deleteInfiniteQueryCache(
  state: Record<string, unknown>,
  matcher: string = 'Api',
) {
  if (!state || !Object.keys(state).length) {
    return
  }

  for (const [key] of Object.entries(state)) {
    if (key.includes(matcher)) {
      const matched = state[key] as StoredApiObject
      if (Object.keys(matched?.queries).length) {
        for (const [queryName] of Object.entries(matched.queries)) {
          if (queryName.toLowerCase().includes('infinite')) {
            delete state[key]['queries'][queryName]
          }
        }
      }
    }
  }
}
