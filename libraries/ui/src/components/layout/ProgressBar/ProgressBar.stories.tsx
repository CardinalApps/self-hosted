import { useState, useEffect } from 'react'
import type { Meta, StoryObj } from '@storybook/react'

import ProgressBar from './ProgressBar'

const meta = {
  title: 'Layout/ProgressBar',
  component: ProgressBar,
  argTypes: {
    current: {
      control: { type: 'range', min: 0, max: 100000, step: 1000 },
      table: { category: 'Progress' },
    },
    total: {
      control: { type: 'range', min: 1, max: 100000, step: 1000 },
      table: { category: 'Progress' },
    },
    showCount: { control: 'boolean', table: { category: 'Display' } },
  },
} satisfies Meta<typeof ProgressBar>
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    current: 20000,
    total: 50000,
    showCount: true,
  },
}

export const NearlyComplete: Story = {
  args: {
    current: 48000,
    total: 50000,
    showCount: true,
  },
}

export const JustStarted: Story = {
  args: {
    current: 500,
    total: 50000,
    showCount: true,
  },
}

export const NoCount: Story = {
  args: {
    current: 30000,
    total: 50000,
    showCount: false,
  },
}

export const Animated: Story = {
  render: () => {
    const total = 10000
    const [current, setCurrent] = useState(0)

    useEffect(() => {
      if (current >= total) return
      const timer = setTimeout(() => setCurrent((c) => Math.min(c + 200, total)), 100)
      return () => clearTimeout(timer)
    }, [current])

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <ProgressBar current={current} total={total} showCount={true} />
        <button onClick={() => setCurrent(0)}>Reset</button>
      </div>
    )
  },
  parameters: {
    controls: { disable: true },
  },
}

export default meta
