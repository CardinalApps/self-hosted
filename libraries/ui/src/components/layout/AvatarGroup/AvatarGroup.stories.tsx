import type { Meta, StoryObj } from '@storybook/react'

import AvatarGroup from './AvatarGroup'

const meta = {
  title: 'Layout/AvatarGroup',
  component: AvatarGroup,
  argTypes: {},
} satisfies Meta<typeof AvatarGroup>
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    avatars: [
      { size: 'xs', type: 'image', image: 'elephant.jpg' },
      { size: 'xs', type: 'color', initials: 'CR', color: 'lightblue' },
      { size: 'xs', type: 'image', image: 'elephant.jpg' },
      { size: 'xs', type: 'color', initials: 'CR', color: 'lightblue' },
      { size: 'xs', type: 'image', image: 'elephant.jpg' },
      { size: 'xs', type: 'color', initials: 'CR', color: 'lightblue' },
    ],
  },
}

export default meta
