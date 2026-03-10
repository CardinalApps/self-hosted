import type { Meta, StoryObj } from '@storybook/react'

import SearchBar from './SearchBar'

const meta = {
  title: 'Interaction/SearchBar',
  component: SearchBar,
  argTypes: {},
} satisfies Meta<typeof SearchBar>
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    size: 'm',
  },
}

export default meta
