import type { Meta, StoryObj } from '@storybook/react'

import MusicAnimation from './MusicAnimation'

const meta = {
  title: 'Layout/MusicAnimation',
  component: MusicAnimation,
  argTypes: {},
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

export default meta
