/**
 * Adds query params to an endpoint.
 */
export const queryParams = (endpoint, params: Record<string, string | number | boolean | string[]> = {}) => {
  const url = new URL(endpoint, `https://this-is-required.com`)

  if (Object.keys(params)) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.append(key, value.toString())
    }
  }

  return url.pathname + url.search
}

export default queryParams
