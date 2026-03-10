import type { Meta, StoryObj } from '@storybook/react'

import MenuButton from './MenuButton'

const meta = {
  title: 'Interaction/MenuButton',
  component: MenuButton,
  argTypes: {},
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

export default meta
