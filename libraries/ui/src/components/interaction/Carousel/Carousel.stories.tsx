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

export default meta
