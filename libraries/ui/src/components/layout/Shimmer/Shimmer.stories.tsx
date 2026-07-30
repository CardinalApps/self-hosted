import type { Meta, StoryObj } from '@storybook/react'

import Shimmer from './Shimmer'

const meta = {
  title: 'Layout/Shimmer',
  component: Shimmer,
  argTypes: {
    rounded: {
      control: { type: 'boolean' },
      table: { category: 'Appearance' },
    },
  },
} satisfies Meta<typeof Shimmer>
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <div style={{ width: 320, height: 100 }}>
      <Shimmer {...args} />
    </div>
  ),
}

export const BlockSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 16 }}>
      <div style={{ width: 480, height: 100 }}>
        <Shimmer />
      </div>
      <div style={{ width: 240, height: 200 }}>
        <Shimmer />
      </div>
    </div>
  ),
  parameters: {
    controls: { disable: true },
  },
}

export default meta
