import type { Meta, StoryObj } from '@storybook/react'

import NumberInput from './NumberInput'

const meta = {
  title: 'Forms/NumberInput',
  component: NumberInput,
  argTypes: {},
} satisfies Meta<typeof NumberInput>
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
}

export default meta
