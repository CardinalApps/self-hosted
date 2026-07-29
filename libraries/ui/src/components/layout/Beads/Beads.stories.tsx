import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'

import Beads from './Beads'

const meta = {
  title: 'Layout/Beads',
  component: Beads,
  decorators: [
    // The tooltip opens upward, so the canvas needs headroom above the row to show it
    (Story) => (
      <div style={{ paddingTop: 60 }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    size: {
      control: { type: 'range', min: 2, max: 20, step: 1 },
      table: { category: 'Size' },
    },
    spacing: {
      control: { type: 'range', min: 0, max: 30, step: 1 },
      table: { category: 'Size' },
    },
    maxSizeRatio: {
      control: { type: 'range', min: 1, max: 5, step: 0.5 },
      table: { category: 'Size' },
    },
    color: { control: 'color', table: { category: 'Appearance' } },
    borderColor: { control: 'color', table: { category: 'Appearance' } },
  },
} satisfies Meta<typeof Beads>
type Story = StoryObj<typeof meta>

// A typical album's per-track play counts, some tracks never played
const SAMPLE_PLAYS = [0, 1, 1, 3, 5, 0, 8, 2, 0, 12, 4, 1, 0, 6, 9]

export const Default: Story = {
  args: {
    beads: SAMPLE_PLAYS.map((value, i) => ({ id: i, value })),
  },
}

export const UnplayedAsOutline: Story = {
  args: {
    beads: SAMPLE_PLAYS.map((value, i) => ({
      id: i,
      value,
      ...(value === 0 ? { color: 'transparent', borderColor: 'var(--accent-color)' } : {}),
    })),
  },
}

export const WithLabels: Story = {
  args: {
    beads: SAMPLE_PLAYS.map((value, i) => ({ id: i, value, label: value || undefined })),
  },
}

export const WithTooltip: Story = {
  args: {
    beads: SAMPLE_PLAYS.map((value, i) => ({ id: i, value, label: `Track ${i + 1}` })),
    renderTooltip: (bead) => (
      <div style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
        {bead.label} &middot; {bead.value} play{bead.value === 1 ? '' : 's'}
      </div>
    ),
  },
}

export const AnimatedMetricSwitch = () => {
  const [metric, setMetric] = useState<'plays' | 'recency'>('plays')
  const plays = [0, 1, 4, 9, 0, 2, 7, 12, 3, 0]
  const recency = [10, 8, 1, 2, 9, 4, 0, 1, 6, 10]
  const values = metric === 'plays' ? plays : recency

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Beads beads={values.map((value, i) => ({ id: i, value }))} />
      <button onClick={() => setMetric(metric === 'plays' ? 'recency' : 'plays')}>
        Switch metric (currently {metric})
      </button>
    </div>
  )
}

export default meta
