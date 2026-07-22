import type { Meta, StoryObj } from '@storybook/react'

import SynthwaveSample from './SynthwaveSample'

const meta = {
  title: 'Graphics/SynthwaveSample',
  component: SynthwaveSample,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    amp: { control: { type: 'range', min: 0, max: 1, step: 0.01 }, table: { category: 'Wave' } },
    yPos: { control: { type: 'range', min: -0.5, max: 0.5, step: 0.01 }, table: { category: 'Wave' } },
    lineWidth: { control: { type: 'range', min: 0.5, max: 5, step: 0.25 }, table: { category: 'Wave' } },

    ghosts: { control: { type: 'range', min: 0, max: 4, step: 1 }, table: { category: 'Electricity' } },
    arcAmp: { control: { type: 'range', min: 0, max: 0.6, step: 0.01 }, table: { category: 'Electricity' } },
    arcFreq: { control: { type: 'range', min: 2, max: 20, step: 0.5 }, table: { category: 'Electricity' } },
    arcSpeed: { control: { type: 'range', min: 0, max: 3, step: 0.05 }, table: { category: 'Electricity' } },

    colorA: { control: 'color', table: { category: 'Colors' } },
    colorB: { control: 'color', table: { category: 'Colors' } },
    hueDrift: { control: { type: 'range', min: 0, max: 60, step: 1 }, table: { category: 'Colors' } },

    glow: { control: { type: 'range', min: 0, max: 1, step: 0.01 }, table: { category: 'Glow & Trails' } },
    trailDecay: { control: { type: 'range', min: 0, max: 0.97, step: 0.01 }, table: { category: 'Glow & Trails' } },
    smearY: { control: { type: 'range', min: 0, max: 0.05, step: 0.001 }, table: { category: 'Glow & Trails' } },
    driftX: { control: { type: 'range', min: -1, max: 1, step: 0.05 }, table: { category: 'Glow & Trails' } },
    exposure: { control: { type: 'range', min: 0.5, max: 3, step: 0.1 }, table: { category: 'Glow & Trails' } },

    chroma: { control: { type: 'range', min: 0, max: 1, step: 0.01 }, table: { category: 'CRT' } },
    scanlines: { control: { type: 'range', min: 0, max: 1, step: 0.01 }, table: { category: 'CRT' } },

    sensitivity: { control: { type: 'range', min: 0.5, max: 2, step: 0.05 }, table: { category: 'Audio' } },
  },
  decorators: [
    (Story) => (
      <div style={{ height: 'calc(100vh - 32px)', padding: 16, background: '#0a0b10', color: '#e8e8f0' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SynthwaveSample>
type Story = StoryObj<typeof meta>

export const Synthwave: Story = {
  args: {
    amp: 0.45,
    yPos: 0,
    lineWidth: 1.5,
    ghosts: 2,
    arcAmp: 0.3,
    arcFreq: 9,
    arcSpeed: 1.1,
    colorA: '#2ee6ff',
    colorB: '#ff3da5',
    hueDrift: 0,
    glow: 0.55,
    trailDecay: 0.8,
    smearY: 0.007,
    driftX: 0,
    chroma: 0.35,
    scanlines: 0.2,
    exposure: 1.4,
    sensitivity: 1,
  },
}

export default meta
