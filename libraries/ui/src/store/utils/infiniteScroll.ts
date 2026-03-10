import { PaginationParams, RTKPage } from "../types/api"

export const ITEMS_PER_RTK_PAGE = 40

/**
 * Drop-in function for RTK's infinite query function by the same name.
 */
export const getNextPageParam = (
  lastPage: RTKPage,
  allPages: RTKPage[],
  lastPageParam: PaginationParams,
) => {
  const nextSkip = lastPageParam.skip + lastPageParam.take
  const total = lastPage[1]

  if (nextSkip >= total) {
    return undefined
  }

  const next = {
    take: lastPageParam.take,
    skip: nextSkip,
  }

  return next
}

/**
 * Drop-in function for RTK's infinite query function by the same name.
 */
export const getPreviousPageParam = (
  firstPage: RTKPage,
  allPages: RTKPage[],
  firstPageParam: PaginationParams,
) => {
  const nextSkip = firstPageParam.skip - firstPageParam.take

  if (nextSkip < 0) {
    return undefined
  }

  const prev = {
    take: firstPageParam.take,
    skip: nextSkip,
  }

  return prev
}
