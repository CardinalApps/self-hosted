import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'

import MarqueeText from './MarqueeText'

const meta = {
  title: 'Typography/MarqueeText',
  component: MarqueeText,
  argTypes: {
    speed: {
      control: { type: 'range', min: 10, max: 120, step: 5 },
    },
  },
} satisfies Meta<typeof MarqueeText>
type Story = StoryObj<typeof meta>

export const Overflowing: Story = {
  args: {
    children: 'An Extremely Long Track Title That Cannot Possibly Fit (Extended Remaster 2026)',
    speed: 30,
  },
  render: (args) => (
    <div style={{ width: 280, fontSize: 24, fontWeight: 800 }}>
      <MarqueeText {...args} />
    </div>
  ),
}

export const Fits: Story = {
  args: {
    children: 'Short Title',
    speed: 30,
  },
  render: (args) => (
    <div style={{ width: 280, fontSize: 24, fontWeight: 800 }}>
      <MarqueeText {...args} />
    </div>
  ),
}

export const ResizableContainer = () => {
  const [width, setWidth] = useState(280)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ width, fontSize: 24, fontWeight: 800, outline: '1px dashed #8884' }}>
        <MarqueeText>The Marquee Only Runs While The Text Overflows</MarqueeText>
      </div>
      <input
        type="range"
        min={120}
        max={700}
        value={width}
        onChange={(e) => setWidth(Number(e.target.value))}
        style={{ width: 300 }}
      />
    </div>
  )
}

export default meta
