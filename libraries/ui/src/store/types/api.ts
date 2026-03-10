export type PaginationParams = {
  take?: number,
  skip?: number,
}

export type CommonSortParams = 'createdAt' | 'playCount'
export type CommonOrderParams = 'ASC' | 'DESC'

export type RTKPage = [Record<string, unknown>[], number]
