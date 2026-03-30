import type { Meta, StoryObj } from '@storybook/react'

import BrandLogo from './BrandLogo'

const meta = {
  title: 'Layout/BrandLogo',
  component: BrandLogo,
  argTypes: {
    icon: {
      control: { type: 'select' },
      options: ['birb', 'cardinal_server', 'cardinal_music', 'cardinal_photos', 'cardinal_cinema'],
      table: { category: 'Content' },
    },
  },
} satisfies Meta<typeof BrandLogo>
type Story = StoryObj<typeof meta>

export const Birb: Story = {
  args: {
    icon: 'birb',
  },
}

export const Server: Story = {
  args: {
    icon: 'cardinal_server',
  },
}

export const Music: Story = {
  args: {
    icon: 'cardinal_music',
  },
}

export const Photos: Story = {
  args: {
    icon: 'cardinal_photos',
  },
}

export const Cinema: Story = {
  args: {
    icon: 'cardinal_cinema',
  },
}

export const AllLogos: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap' }}>
      {([
        ['birb', 'Cardinal'],
        ['cardinal_server', 'Server'],
        ['cardinal_music', 'Music'],
        ['cardinal_photos', 'Photos'],
        ['cardinal_cinema', 'Cinema'],
      ] as const).map(([icon, label]) => (
        <div key={icon} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <BrandLogo icon={icon} />
          <span style={{ fontSize: 12, opacity: 0.6 }}>{label}</span>
        </div>
      ))}
    </div>
  ),
  parameters: {
    controls: { disable: true },
  },
}

export default meta
