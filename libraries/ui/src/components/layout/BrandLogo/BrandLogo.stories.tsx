import type { Meta, StoryObj } from '@storybook/react'

import BrandLogo from './BrandLogo'

const meta = {
  title: 'Layout/BrandLogo',
  component: BrandLogo,
  argTypes: {},
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

export default meta
