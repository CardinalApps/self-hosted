import type { Meta, StoryObj } from '@storybook/react'
import UserTag from './UserTag'

const meta = {
  title: 'Interaction/User',
  component: UserTag,
  argTypes: {},
} satisfies Meta<typeof UserTag>
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {

  },
}

export default meta
