import type { Meta, StoryObj } from '@storybook/react'

import H3 from './H3'

const meta = {
  title: 'Typography/H3',
  component: H3,
  argTypes: {
    children: { control: 'text', table: { category: 'Content' } },
  },
} satisfies Meta<typeof H3>
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: 'The quick Cardinal jumps over the lazy dog',
  },
}

export default meta
