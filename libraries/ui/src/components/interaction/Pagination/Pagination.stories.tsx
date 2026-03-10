import { useState } from 'react'
import type { Meta } from '@storybook/react'

import Pagination from './Pagination'

const meta = {
  title: 'Interaction/Pagination',
  component: Pagination,
  argTypes: {},
} satisfies Meta<typeof Pagination>

export const SmallNumberOfPages = () => {
  const [currentPage, setCurrentPage] = useState(1)

  return (
    <Pagination
      page={currentPage}
      maxPages={4}
      onPageChange={(page) => setCurrentPage(page)}
    />
  )
}

export const MediumNumberOfPages = () => {
  const [currentPage, setCurrentPage] = useState(1)

  return (
    <Pagination
      page={currentPage}
      maxPages={185}
      onPageChange={(page) => setCurrentPage(page)}
    />
  )
}

export const LargeNumberOfPages = () => {
  const [currentPage, setCurrentPage] = useState(1)

  return (
    <Pagination
      page={currentPage}
      maxPages={850}
      onPageChange={(page) => setCurrentPage(page)}
    />
  )
}

export const HugeNumberOfPages = () => {
  const [currentPage, setCurrentPage] = useState(1)

  return (
    <Pagination
      page={currentPage}
      maxPages={8170}
      onPageChange={(page) => setCurrentPage(page)}
    />
  )
}

export default meta
