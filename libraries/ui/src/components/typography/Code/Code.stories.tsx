import type { Meta, StoryObj } from '@storybook/react'

import Code from './Code'

const meta = {
  title: 'Typography/Code',
  component: Code,
  argTypes: {},
} satisfies Meta<typeof Code>
type Story = StoryObj<typeof meta>

export const Inline: Story = {
  args: {
    children: 'ResourceType',
  },
}

export const Block: Story = {
  args: {
    children: (
      `const filter = (data) => data.filter((item) => !!item.value)
      const result = filter.includes('psuedo code)
      
      if (result) {
        return 'Success'
      }`
    ),
  },
}

export default meta
