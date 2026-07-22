import type { Meta, StoryObj } from '@storybook/react'

import SpectrumBarsSample from './SpectrumBarsSample'

const meta = {
  title: 'Graphics/SpectrumBarsSample',
  component: SpectrumBarsSample,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    barCount: { control: { type: 'range', min: 4, max: 96, step: 1 }, table: { category: 'Bars' } },
    gap: { control: { type: 'range', min: 0, max: 0.8, step: 0.01 }, table: { category: 'Bars' } },
    maxHeight: { control: { type: 'range', min: 0.2, max: 0.9, step: 0.01 }, table: { category: 'Bars' } },
    baseline: { control: { type: 'range', min: 0.05, max: 0.5, step: 0.01 }, table: { category: 'Bars' } },
    cornerRadius: { control: { type: 'range', min: 0, max: 1, step: 0.05 }, table: { category: 'Bars' } },

    capThickness: { control: { type: 'range', min: 1, max: 6, step: 0.5 }, table: { category: 'Peak caps' } },
    capGravity: { control: { type: 'range', min: 0.5, max: 6, step: 0.1 }, table: { category: 'Peak caps' } },
    capHold: { control: { type: 'range', min: 0, max: 0.6, step: 0.02 }, table: { category: 'Peak caps' } },

    colorLow: { control: 'color', table: { category: 'Colors' } },
    colorHigh: { control: 'color', table: { category: 'Colors' } },
    colorCap: { control: 'color', table: { category: 'Colors' } },
    hueDrift: { control: { type: 'range', min: 0, max: 60, step: 1 }, table: { category: 'Colors' } },

    glow: { control: { type: 'range', min: 0, max: 1, step: 0.01 }, table: { category: 'Glow & Trails' } },
    reflection: { control: { type: 'range', min: 0, max: 1, step: 0.01 }, table: { category: 'Glow & Trails' } },
    trailDecay: { control: { type: 'range', min: 0, max: 0.97, step: 0.01 }, table: { category: 'Glow & Trails' } },
    driftY: { control: { type: 'range', min: 0, max: 0.01, step: 0.0005 }, table: { category: 'Glow & Trails' } },
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
} satisfies Meta<typeof SpectrumBarsSample>
type Story = StoryObj<typeof meta>

export const SpectrumBars: Story = {
  args: {
    barCount: 32,
    gap: 0.3,
    maxHeight: 0.62,
    baseline: 0.26,
    cornerRadius: 0.6,
    capThickness: 2.5,
    capGravity: 2.2,
    capHold: 0.22,
    reflection: 0.35,
    colorLow: '#ff3d81',
    colorHigh: '#2ee6ff',
    colorCap: '#ffffff',
    hueDrift: 0,
    glow: 0.45,
    trailDecay: 0.7,
    driftY: 0.002,
    exposure: 1.4,
    sensitivity: 1,
  },
}

export default meta
