import type { Meta, StoryObj } from '@storybook/react'

import Loading from './Loading'

const meta = {
  title: 'Layout/Loading',
  component: Loading,
  argTypes: {
    size: {
      control: { type: 'select' },
      options: ['s', 'm', 'l'],
      table: { category: 'Appearance' },
    },
  },
} satisfies Meta<typeof Loading>
type Story = StoryObj<typeof meta>

export const Small: Story = {
  args: {
    size: 's',
  },
}

export const Medium: Story = {
  args: {
    size: 'm',
  },
}

export const Large: Story = {
  args: {
    size: 'l',
  },
}

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <Loading size="s" />
        <span style={{ fontSize: 12, opacity: 0.6 }}>Small</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <Loading size="m" />
        <span style={{ fontSize: 12, opacity: 0.6 }}>Medium</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <Loading size="l" />
        <span style={{ fontSize: 12, opacity: 0.6 }}>Large</span>
      </div>
    </div>
  ),
  parameters: {
    controls: { disable: true },
  },
}

export default meta
