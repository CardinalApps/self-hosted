import type { Meta, StoryObj } from '@storybook/react'

import HasCapabilities from './HasCapabilities'

const meta = {
  title: 'Layout/HasCapabilities',
  component: HasCapabilities,
  argTypes: {},
} satisfies Meta<typeof HasCapabilities>
type Story = StoryObj<typeof meta>

export const UserGrantedAccess: Story = {
  args: {
    capabilities: ['AdminApp.Login'],
  },
}

export const UserDeniedAccess: Story = {
  args: {
    capabilities: ['AdminApp.Login'],
  },
}

export default meta
