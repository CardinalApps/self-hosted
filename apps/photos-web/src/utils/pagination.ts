export const appendPaginationParams = (endpoint, take, skip = 0) => {
  const url = new URL(endpoint, `https://this-is-required.com`)
  url.searchParams.append('take', take)
  url.searchParams.append('skip', skip.toString())
  return url.pathname + url.search
}
