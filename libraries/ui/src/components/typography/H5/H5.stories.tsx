import type { Meta, StoryObj } from '@storybook/react'

import H5 from './H5'

const meta = {
  title: 'Typography/H5',
  component: H5,
  argTypes: {},
} satisfies Meta<typeof H5>
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: 'Default Heading 5',
  },
}

export default meta
