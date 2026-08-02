import type { Meta, StoryObj } from '@storybook/react'

import Carousel from './Carousel'

const meta = {
  title: 'Interaction/Carousel',
  component: Carousel,
  argTypes: {
    width: {
      control: { type: 'range', min: 200, max: 800, step: 20 },
      table: { category: 'Layout' },
    },
    initialSlide: {
      control: { type: 'number' },
      table: { category: 'Behavior' },
    },
    next: { control: 'boolean', table: { category: 'Controls' } },
    prev: { control: 'boolean', table: { category: 'Controls' } },
    title: { control: 'text', table: { category: 'Content' } },
  },
} satisfies Meta<typeof Carousel>
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    width: 400,
    initialSlide: 0,
    title: 'Sample Images',
    next: true,
    prev: true,
    items: [
      <img src="/sample/images/original/birb.jpg" style={{ width: 400 }} />,
      <img src="/sample/images/original/book.jpg" style={{ width: 400 }} />,
      <img src="/sample/images/original/face.jpg" style={{ width: 400 }} />,
      <img src="/sample/images/original/car.jpg" style={{ width: 400 }} />,
    ],
  },
}

export const NoControls: Story = {
  args: {
    width: 400,
    initialSlide: 0,
    next: false,
    prev: false,
    items: [
      <img src="/sample/images/original/birb.jpg" style={{ width: 400 }} />,
      <img src="/sample/images/original/book.jpg" style={{ width: 400 }} />,
      <img src="/sample/images/original/face.jpg" style={{ width: 400 }} />,
    ],
  },
}

export const StartingOnSlide3: Story = {
  args: {
    width: 640,
    initialSlide: 2,
    title: 'Starting on slide 3',
    next: true,
    prev: true,
    items: [
      <img src="/sample/images/original/birb.jpg" style={{ width: 400 }} />,
      <img src="/sample/images/original/book.jpg" style={{ width: 400 }} />,
      <img src="/sample/images/original/face.jpg" style={{ width: 400 }} />,
      <img src="/sample/images/original/car.jpg" style={{ width: 400 }} />,
    ],
  },
}

const row = (label: string) => (
  <div
    key={label}
    style={{
      height: 44,
      padding: '0 15px',
      marginBottom: 10,
      display: 'flex',
      alignItems: 'center',
      borderRadius: 8,
      background: 'var(--bg-2)',
    }}
  >
    {label}
  </div>
)

// Each slide is a page of 8 rows, two columns of four, filled top to bottom
export const TwoCols: Story = {
  args: {
    width: 900,
    initialSlide: 0,
    title: 'Two columns',
    next: true,
    prev: true,
    gap: '10px',
    dragFree: false,
    columns: 2,
    rows: 4,
    maxPages: 3,
    items: [0, 1, 2].map((page) => (
      Array.from({ length: 8 }, (item, i) => row(`Track ${page * 8 + i + 1}`))
    )),
  },
}

export default meta
