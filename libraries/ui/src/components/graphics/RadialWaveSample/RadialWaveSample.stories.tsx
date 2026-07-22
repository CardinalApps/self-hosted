import type { Meta, StoryObj } from '@storybook/react'

import RadialWaveSample from './RadialWaveSample'

const meta = {
  title: 'Graphics/RadialWaveSample',
  component: RadialWaveSample,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    ringCount: { control: { type: 'range', min: 1, max: 5, step: 1 }, table: { category: 'Rings' } },
    pulseAmp: { control: { type: 'range', min: 0, max: 0.6, step: 0.01 }, table: { category: 'Rings' } },
    dispAmp: { control: { type: 'range', min: 0, max: 0.5, step: 0.01 }, table: { category: 'Rings' } },
    lineWidth: { control: { type: 'range', min: 0.5, max: 6, step: 0.5 }, table: { category: 'Rings' } },
    symmetry: { control: { type: 'range', min: 1, max: 8, step: 1 }, table: { category: 'Rings' } },

    colorBass: { control: 'color', table: { category: 'Colors' } },
    colorMid: { control: 'color', table: { category: 'Colors' } },
    colorTreble: { control: 'color', table: { category: 'Colors' } },
    colorFour: { control: 'color', table: { category: 'Colors' } },
    colorFive: { control: 'color', table: { category: 'Colors' } },
    hueDrift: { control: { type: 'range', min: 0, max: 60, step: 1 }, table: { category: 'Colors' } },

    glow: { control: { type: 'range', min: 0, max: 1, step: 0.01 }, table: { category: 'Glow & Trails' } },
    trailDecay: { control: { type: 'range', min: 0, max: 0.97, step: 0.01 }, table: { category: 'Glow & Trails' } },
    trailZoom: { control: { type: 'range', min: 0, max: 0.02, step: 0.001 }, table: { category: 'Glow & Trails' } },
    trailSpin: { control: { type: 'range', min: -1, max: 1, step: 0.02 }, table: { category: 'Glow & Trails' } },
    exposure: { control: { type: 'range', min: 0.5, max: 3, step: 0.1 }, table: { category: 'Glow & Trails' } },

    sensitivity: { control: { type: 'range', min: 0.5, max: 2, step: 0.05 }, table: { category: 'Audio' } },
  },
  decorators: [
    (Story) => (
      <div style={{ height: 'calc(100vh - 32px)', padding: 16, background: '#0a0b10', color: '#e8e8f0' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RadialWaveSample>
type Story = StoryObj<typeof meta>

export const RadialWave: Story = {
  args: {
    ringCount: 3,
    pulseAmp: 0.22,
    dispAmp: 0.13,
    lineWidth: 2,
    symmetry: 1,
    colorBass: '#ff3d81',
    colorMid: '#2ee6ff',
    colorTreble: '#ffd166',
    colorFour: '#8b5cf6',
    colorFive: '#34d399',
    hueDrift: 2,
    glow: 0.5,
    trailDecay: 0.82,
    trailZoom: 0.006,
    trailSpin: 0.18,
    exposure: 1.4,
    sensitivity: 1,
  },
}

export default meta
