import type { Meta, StoryObj } from '@storybook/react'

import MusicAnimation from './MusicAnimation'

const meta = {
  title: 'Layout/MusicAnimation',
  component: MusicAnimation,
  argTypes: {
    size: {
      control: { type: 'select' },
      options: ['s', 'm'],
      table: { category: 'Appearance' },
    },
  },
} satisfies Meta<typeof MusicAnimation>
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

export const BothSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-end' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <MusicAnimation size="s" />
        <span style={{ fontSize: 12, opacity: 0.6 }}>Small</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <MusicAnimation size="m" />
        <span style={{ fontSize: 12, opacity: 0.6 }}>Medium</span>
      </div>
    </div>
  ),
  parameters: {
    controls: { disable: true },
  },
}

export default meta
