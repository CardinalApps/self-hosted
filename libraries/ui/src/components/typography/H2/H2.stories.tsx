import type { Meta, StoryObj } from '@storybook/react'

import H2 from './H2'

const meta = {
  title: 'Typography/H2',
  component: H2,
  argTypes: {},
} satisfies Meta<typeof H2>
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: 'Default Heading 2',
  },
}

export default meta
