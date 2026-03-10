import type { Meta, StoryObj } from '@storybook/react'

import H6 from './H6'

const meta = {
  title: 'Typography/H6',
  component: H6,
  argTypes: {},
} satisfies Meta<typeof H6>
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: 'Default Heading 6',
  },
}

export default meta
