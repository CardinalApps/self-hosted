import type { Meta, StoryObj } from '@storybook/react'

import EchoTunnelSample from './EchoTunnelSample'

const meta = {
  title: 'Graphics/EchoTunnelSample',
  component: EchoTunnelSample,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    ringRadius: { control: { type: 'range', min: 0.15, max: 0.7, step: 0.01 }, table: { category: 'Ring' } },
    ringWidth: { control: { type: 'range', min: 0.5, max: 6, step: 0.25 }, table: { category: 'Ring' } },
    waveAmp: { control: { type: 'range', min: 0, max: 0.4, step: 0.01 }, table: { category: 'Ring' } },
    glow: { control: { type: 'range', min: 0, max: 1, step: 0.01 }, table: { category: 'Ring' } },

    color: { control: 'color', table: { category: 'Colors' } },
    hueCycle: { control: { type: 'range', min: 0, max: 90, step: 1 }, table: { category: 'Colors' } },

    zoom: { control: { type: 'range', min: 0, max: 0.03, step: 0.001 }, table: { category: 'Tunnel' } },
    bassZoom: { control: { type: 'range', min: 0, max: 0.06, step: 0.002 }, table: { category: 'Tunnel' } },
    spin: { control: { type: 'range', min: -0.5, max: 0.5, step: 0.02 }, table: { category: 'Tunnel' } },
    midSpin: { control: { type: 'range', min: -2, max: 2, step: 0.05 }, table: { category: 'Tunnel' } },
    rippleAmp: { control: { type: 'range', min: 0, max: 0.05, step: 0.002 }, table: { category: 'Tunnel' } },
    rippleFreq: { control: { type: 'range', min: 4, max: 40, step: 1 }, table: { category: 'Tunnel' } },
    rippleSpeed: { control: { type: 'range', min: 0, max: 6, step: 0.1 }, table: { category: 'Tunnel' } },
    trailDecay: { control: { type: 'range', min: 0.5, max: 0.96, step: 0.01 }, table: { category: 'Tunnel' } },

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
} satisfies Meta<typeof EchoTunnelSample>
type Story = StoryObj<typeof meta>

export const EchoTunnel: Story = {
  args: {
    ringRadius: 0.4,
    ringWidth: 2,
    waveAmp: 0.16,
    glow: 0.5,
    color: '#2ee6ff',
    hueCycle: 24,
    zoom: 0.01,
    bassZoom: 0.022,
    spin: 0.1,
    midSpin: 0.6,
    rippleAmp: 0.012,
    rippleFreq: 15,
    rippleSpeed: 2.2,
    trailDecay: 0.93,
    exposure: 1.3,
    sensitivity: 1,
  },
}

export default meta
