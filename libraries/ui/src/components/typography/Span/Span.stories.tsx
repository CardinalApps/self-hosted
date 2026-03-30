import type { Meta, StoryObj } from '@storybook/react'

import Span from './Span'

const meta = {
  title: 'Typography/Span',
  component: Span,
  argTypes: {
    children: { control: 'text', table: { category: 'Content' } },
  },
} satisfies Meta<typeof Span>
type Story = StoryObj<typeof meta>

export const Inline: Story = {
  args: {
    children: 'This is an inline text span.',
  },
}

export const InContext: Story = {
  render: () => (
    <p>
      Stream your music collection with{' '}
      <Span>Cardinal Music</Span>
      {', your photos with '}
      <Span>Cardinal Photos</Span>
      {', and your films with '}
      <Span>Cardinal Cinema</Span>.
    </p>
  ),
  parameters: {
    controls: { disable: true },
  },
}

export default meta
