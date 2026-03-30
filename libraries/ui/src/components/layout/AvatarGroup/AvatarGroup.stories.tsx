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
      { size: 'xs', type: 'color', initials: 'CR', color: '#cc4c43' },
      { size: 'xs', type: 'color', initials: 'JD', color: 'steelblue' },
      { size: 'xs', type: 'image', image: 'elephant.jpg' },
      { size: 'xs', type: 'color', initials: 'AM', color: '#6ab04c' },
      { size: 'xs', type: 'guest' },
      { size: 'xs', type: 'color', initials: 'PK', color: '#5f27cd' },
    ],
  },
}

export const LargeGroup: Story = {
  args: {
    avatars: [
      { size: 'xs', type: 'color', initials: 'CR', color: '#cc4c43' },
      { size: 'xs', type: 'color', initials: 'JD', color: 'steelblue' },
      { size: 'xs', type: 'image', image: 'elephant.jpg' },
      { size: 'xs', type: 'color', initials: 'AM', color: '#6ab04c' },
      { size: 'xs', type: 'guest' },
      { size: 'xs', type: 'color', initials: 'PK', color: '#5f27cd' },
      { size: 'xs', type: 'color', initials: 'SL', color: '#f9ca24' },
      { size: 'xs', type: 'color', initials: 'BB', color: '#ee5a24' },
      { size: 'xs', type: 'color', initials: 'TC', color: '#1dd1a1' },
      { size: 'xs', type: 'color', initials: 'NW', color: '#48dbfb' },
    ],
  },
}

export default meta
