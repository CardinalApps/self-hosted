import { useState, useEffect } from 'react'
import type { Meta, StoryObj } from '@storybook/react'

import ProgressCircle from './ProgressCircle'

const meta = {
  title: 'Layout/ProgressCircle',
  component: ProgressCircle,
  argTypes: {
    current: {
      control: { type: 'range', min: 0, max: 1, step: 0.01 },
      table: { category: 'Progress' },
    },
    showPercentage: { control: 'boolean', table: { category: 'Display' } },
    size: {
      control: { type: 'range', min: 40, max: 200, step: 4 },
      table: { category: 'Appearance' },
    },
    strokeWidth: {
      control: { type: 'range', min: 2, max: 20, step: 1 },
      table: { category: 'Appearance' },
    },
    fontSize: {
      control: { type: 'range', min: 8, max: 32, step: 1 },
      table: { category: 'Appearance' },
    },
  },
} satisfies Meta<typeof ProgressCircle>
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    current: 0.25,
    showPercentage: true,
  },
}

export const HalfComplete: Story = {
  args: {
    current: 0.5,
    showPercentage: true,
  },
}

export const Complete: Story = {
  args: {
    current: 1,
    showPercentage: true,
  },
}

export const Large: Story = {
  args: {
    current: 0.72,
    showPercentage: true,
    size: 160,
    strokeWidth: 10,
    fontSize: 28,
  },
}

export const Animated: Story = {
  render: () => {
    const [current, setCurrent] = useState(0)

    useEffect(() => {
      if (current >= 1) return
      const timer = setTimeout(() => setCurrent((c) => Math.min(+(c + 0.02).toFixed(2), 1)), 80)
      return () => clearTimeout(timer)
    }, [current])

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-start' }}>
        <ProgressCircle current={current} showPercentage={true} size={100} />
        <button onClick={() => setCurrent(0)}>Reset</button>
      </div>
    )
  },
  parameters: {
    controls: { disable: true },
  },
}

export default meta
