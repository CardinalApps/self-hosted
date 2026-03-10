import type { Meta, StoryObj } from '@storybook/react'

import H4 from './H4'

const meta = {
  title: 'Typography/H4',
  component: H4,
  argTypes: {},
} satisfies Meta<typeof H4>
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: 'Default Heading 4',
  },
}

export default meta
