import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'

import Pagination from './Pagination'

const meta = {
  title: 'Interaction/Pagination',
  component: Pagination,
  argTypes: {
    maxPages: {
      control: { type: 'number' },
      table: { category: 'Range' },
    },
  },
} satisfies Meta<typeof Pagination>
type Story = StoryObj<typeof meta>

const PaginationDemo = ({ maxPages }: { maxPages: number }) => {
  const [currentPage, setCurrentPage] = useState(1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Pagination
        page={currentPage}
        maxPages={maxPages}
        onPageChange={(page) => setCurrentPage(page)}
      />
      <div style={{ fontSize: 12, opacity: 0.6 }}>
        Page {currentPage} of {maxPages}
      </div>
    </div>
  )
}

export const SmallNumberOfPages = () => <PaginationDemo maxPages={4} />
export const MediumNumberOfPages = () => <PaginationDemo maxPages={185} />
export const LargeNumberOfPages = () => <PaginationDemo maxPages={850} />
export const HugeNumberOfPages = () => <PaginationDemo maxPages={8170} />

export default meta
