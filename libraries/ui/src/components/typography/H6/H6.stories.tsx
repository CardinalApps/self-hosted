import type { Meta, StoryObj } from '@storybook/react'

import H6 from './H6'

const meta = {
  title: 'Typography/H6',
  component: H6,
  argTypes: {
    children: { control: 'text', table: { category: 'Content' } },
  },
} satisfies Meta<typeof H6>
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: 'The quick Cardinal jumps over the lazy dog',
  },
}

export default meta
