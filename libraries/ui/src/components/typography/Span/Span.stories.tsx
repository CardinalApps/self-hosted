import type { Meta, StoryObj } from '@storybook/react'

import Span from './Span'

const meta = {
  title: 'Typography/Span',
  component: Span,
  argTypes: {},
} satisfies Meta<typeof Span>
type Story = StoryObj<typeof meta>

export const Inline: Story = {
  args: {
    children: 'Lorem ipsum dolor sit amet.',
  },
}

export default meta
