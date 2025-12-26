import type { Meta, StoryObj } from '@storybook/react'

import CurrentUserIsCapable from './HasAccess'

const meta = {
  title: 'Layout/HasAccess',
  component: CurrentUserIsCapable,
  argTypes: {},
} satisfies Meta<typeof CurrentUserIsCapable>
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
