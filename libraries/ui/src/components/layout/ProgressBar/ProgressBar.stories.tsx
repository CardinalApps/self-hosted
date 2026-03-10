import type { Meta, StoryObj } from '@storybook/react'

import ProgressBar from './ProgressBar'

const meta = {
  title: 'Layout/ProgressBar',
  component: ProgressBar,
  argTypes: {},
} satisfies Meta<typeof ProgressBar>
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    current: 20000,
    total: 50000,
    showCount: true,
  },
}

export default meta
