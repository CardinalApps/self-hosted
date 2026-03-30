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
    children: (
      <div style={{ padding: 20, border: '1px solid green', borderRadius: 6 }}>
        This content is visible because the user has the required capability.
      </div>
    ),
  },
}

export const UserDeniedAccess: Story = {
  args: {
    capabilities: ['AdminApp.Login'],
    children: (
      <div style={{ padding: 20, border: '1px solid orange', borderRadius: 6 }}>
        This content should be hidden — the user does not have the required capability.
      </div>
    ),
  },
}

export default meta
