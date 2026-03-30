import type { Meta, StoryObj } from '@storybook/react'

import H1 from './H1'

const meta = {
  title: 'Typography/H1',
  component: H1,
  argTypes: {
    children: { control: 'text', table: { category: 'Content' } },
  },
} satisfies Meta<typeof H1>
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: 'The quick Cardinal jumps over the lazy dog',
  },
}

export default meta
