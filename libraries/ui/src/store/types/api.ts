export type PaginationParams = {
  take?: number,
  skip?: number,
}

export type CommonOrderParams = 'ASC' | 'DESC'

export type RTKPage = [Record<string, unknown>[], number]
