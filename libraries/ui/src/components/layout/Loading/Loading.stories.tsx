import type { Meta, StoryObj } from '@storybook/react'

import Loading from './Loading'

const meta = {
  title: 'Layout/Loading',
  component: Loading,
  argTypes: {},
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

export default meta
