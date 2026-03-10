import type { Meta, StoryObj } from '@storybook/react'

import AppMenu from './AppMenu'

const meta = {
  title: 'Interaction/AppMenu',
  component: AppMenu,
  argTypes: {},
} satisfies Meta<typeof AppMenu>
type Story = StoryObj<typeof meta>

export const LeftAlign: Story = {
  args: {
    align: 'left',
  },
}

export const CenterAlign: Story = {
  args: {
    align: 'center',
  },
}

export const RightAlign: Story = {
  args: {
    align: 'right',
  },
}

export default meta
