import type { Meta, StoryObj } from '@storybook/react'

import MenuButton from './MenuButton'

const meta = {
  title: 'Interaction/MenuButton',
  component: MenuButton,
  argTypes: {
    size: {
      control: { type: 'select' },
      options: ['s', 'm'],
      table: { category: 'Appearance' },
    },
    solid: { control: 'boolean', table: { category: 'Appearance' } },
  },
} satisfies Meta<typeof MenuButton>
type Story = StoryObj<typeof meta>

export const Small: Story = {
  args: {
    size: 's',
    solid: false,
  },
}

export const Medium: Story = {
  args: {
    size: 'm',
    solid: false,
  },
}

export const Solid: Story = {
  args: {
    size: 'm',
    solid: true,
  },
}

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      <MenuButton size="s" solid={false} />
      <MenuButton size="m" solid={false} />
      <MenuButton size="m" solid={true} />
    </div>
  ),
  parameters: {
    controls: { disable: true },
  },
}

export default meta
