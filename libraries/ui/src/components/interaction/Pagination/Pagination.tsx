import type { PropsWithChildren } from 'react'

import './Pagination.css'

type PaginationProps = {
  page: number,
  maxPages: number,
  onPageChange: (newPage) => void,
}

/**
 * Run of the mill pagination.
 */
const Pagination = ({
  page,
  maxPages,
  onPageChange,
}: PropsWithChildren<PaginationProps>) => {
  const handlePageChange = (newPage) => {
    if (newPage === page) return

    if (typeof onPageChange === 'function') {
      onPageChange(newPage)
    }
  }

  const renderButton = (pageNum) => {
    return (
      <button
        key={`page-${pageNum}`}
        className={`pagination-page ${pageNum === page ? 'active' : ''}`}
        type="button"
        onClick={() => handlePageChange(pageNum)}
      >
        {pageNum}
      </button>
    )
  }

  const renderDynamicPages = () => {
    const pagesToRender = [
      page - 10000,
      page - 1000,
      page - 100,
      page - 50,
      page - 10,
      page - 2,
      page - 1,
      page,
      page + 1,
      page + 2,
      page + 10,
      page + 50,
      page + 100,
      page + 1000,
      page + 10000,
    ].filter((num) => num > 1 && num < maxPages)

    return pagesToRender.map((page) => renderButton(page))
  }

  // Small number of pages
  if (maxPages <= 6) {
    return (
      <div className="pagination">
        {Array.from(Array(maxPages)).map((item, index) => renderButton(index + 1))}
      </div>
    )
  }
  // Large number of pages
  else {
    return (
      <div className="pagination">
        {renderButton(1)}
        {renderDynamicPages()}
        {renderButton(maxPages)}
      </div>
    )
  }
}

export default Pagination
