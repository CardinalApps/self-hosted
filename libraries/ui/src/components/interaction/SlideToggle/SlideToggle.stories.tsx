import type { Meta, StoryObj } from '@storybook/react'

import SlideToggle from './SlideToggle'

const meta = {
  title: 'Interaction/SlideToggle',
  component: SlideToggle,
  argTypes: {},
} satisfies Meta<typeof SlideToggle>
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    title: 'Section title',
    children: (
      <div style={{ padding: '10px 0' }}>
        <p>First row of content</p>
        <p>Second row of content</p>
        <p>Third row of content</p>
      </div>
    ),
  },
}

export const InitiallyClosed: Story = {
  args: {
    ...Default.args,
    defaultOpen: false,
  },
}

export default meta
