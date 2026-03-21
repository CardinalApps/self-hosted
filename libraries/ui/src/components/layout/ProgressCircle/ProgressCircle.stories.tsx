import type { Meta, StoryObj } from '@storybook/react'

import ProgressCircle from './ProgressCircle'

const meta = {
  title: 'Layout/ProgressCircle',
  component: ProgressCircle,
  argTypes: {},
} satisfies Meta<typeof ProgressCircle>
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    current: 0.25,
    showPercentage: true,
  },
}

export default meta
