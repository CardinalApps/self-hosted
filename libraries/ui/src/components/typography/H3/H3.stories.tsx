import type { Meta, StoryObj } from '@storybook/react'

import H3 from './H3'

const meta = {
  title: 'Typography/H3',
  component: H3,
  argTypes: {},
} satisfies Meta<typeof H3>
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: 'Default Heading 3',
  },
}

export default meta
