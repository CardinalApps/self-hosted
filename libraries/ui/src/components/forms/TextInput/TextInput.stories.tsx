import type { Meta, StoryObj } from '@storybook/react'

import TextInput from './TextInput'

const meta = {
  title: 'Forms/TextInput',
  component: TextInput,
  argTypes: {},
} satisfies Meta<typeof TextInput>
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    type: "text",
  },
}

export default meta
