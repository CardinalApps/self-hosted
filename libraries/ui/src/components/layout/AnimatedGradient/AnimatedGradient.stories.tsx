import { useState } from 'react'

import type { Meta, StoryObj } from '@storybook/react'

import AnimatedGradient from './AnimatedGradient'

const meta = {
  title: 'Layout/AnimatedGradient',
  component: AnimatedGradient,
  argTypes: {
    // Color inputs
    values: { control: false },

    // Transition
    transitionDuration: { control: { type: 'range', min: 100, max: 5000, step: 100 }, table: { category: 'Transition' } },

    // Dance toggle
    dance: { control: 'boolean', table: { category: 'Dance' } },

    // Hue
    huePull:  { control: { type: 'range', min: 0, max: 1,   step: 0.01 }, table: { category: 'Dance · Hue' } },
    hueNoise: { control: { type: 'range', min: 0, max: 180, step: 1    }, table: { category: 'Dance · Hue' } },

    // Saturation
    satPull:  { control: { type: 'range', min: 0,   max: 1,   step: 0.01 }, table: { category: 'Dance · Saturation' } },
    satNoise: { control: { type: 'range', min: 0,   max: 50,  step: 1    }, table: { category: 'Dance · Saturation' } },
    satMin:   { control: { type: 'range', min: 0,   max: 100, step: 1    }, table: { category: 'Dance · Saturation' } },
    satMax:   { control: { type: 'range', min: 0,   max: 100, step: 1    }, table: { category: 'Dance · Saturation' } },

    // Lightness
    lightPull:  { control: { type: 'range', min: 0,   max: 1,   step: 0.01 }, table: { category: 'Dance · Lightness' } },
    lightNoise: { control: { type: 'range', min: 0,   max: 50,  step: 1    }, table: { category: 'Dance · Lightness' } },
    lightMin:   { control: { type: 'range', min: 0,   max: 100, step: 1    }, table: { category: 'Dance · Lightness' } },
    lightMax:   { control: { type: 'range', min: 0,   max: 100, step: 1    }, table: { category: 'Dance · Lightness' } },

    // Timings
    burstChance: { control: { type: 'range', min: 0,     max: 1,     step: 0.01  }, table: { category: 'Dance · Timings' } },
    burstMin:    { control: { type: 'range', min: 100,   max: 10000, step: 100   }, table: { category: 'Dance · Timings' } },
    burstMax:    { control: { type: 'range', min: 100,   max: 10000, step: 100   }, table: { category: 'Dance · Timings' } },
    driftMin:    { control: { type: 'range', min: 1000,  max: 60000, step: 1000  }, table: { category: 'Dance · Timings' } },
    driftMax:    { control: { type: 'range', min: 1000,  max: 60000, step: 1000  }, table: { category: 'Dance · Timings' } },
  },
} satisfies Meta<typeof AnimatedGradient>
type Story = StoryObj<typeof meta>

const palettes = [
  ['#34b73f', '#2f1773', '#5f1585'],
  ['#48dbfb', '#1dd1a1', '#00d2d3'],
  ['#5f27cd', '#341f97', '#ee5a24'],
  ['#f9ca24', '#6ab04c', '#eb4d4b'],
]

const AnimatedExample = () => {
  const [index, setIndex] = useState(0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-start' }}>
      <div style={{ width: 400, height: 300 }}>
        <AnimatedGradient values={palettes[index]} />
      </div>
      <button onClick={() => setIndex((i) => (i + 1) % palettes.length)}>
        Next palette
      </button>
    </div>
  )
}

export const Blotchy: Story = {
  args: {
    values: ['#34b73f', '#2f1773', '#5f1585'],
  },
  decorators: [
    (Story) => (
      <div style={{ width: 400, height: 300 }}>
        <Story />
      </div>
    ),
  ],
}

export const AnimatedTransition: Story = {
  render: () => <AnimatedExample />,
  args: {
    values: palettes[0],
  },
}

export const Dance: Story = {
  args: {
    values: ['#2979ff', '#9c27b0', '#e91e63'],
    dance: true,
    transitionDuration: 200,
    huePull: 0.78,
    hueNoise: 139,
    satPull: 0.9,
    satNoise: 39,
    lightPull: 0.2,
    lightNoise: 8,
    satMin: 68,
    satMax: 95,
    lightMin: 20,
    lightMax: 80,
    burstChance: 1,
    burstMin: 400,
    burstMax: 1100,
    driftMin: 45000,
    driftMax: 48000,
  },
  decorators: [
    (Story) => (
      <div style={{ width: 400, height: 400 }}>
        <Story />
      </div>
    ),
  ],
}

export default meta
