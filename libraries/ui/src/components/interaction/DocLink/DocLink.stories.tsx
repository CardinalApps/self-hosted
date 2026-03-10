import type { Meta, StoryObj } from '@storybook/react'

import DocLink from './DocLink'

const meta = {
  title: 'Interaction/DocLink',
  component: DocLink,
  argTypes: {},
} satisfies Meta<typeof DocLink>
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    href: '/guides/best-practices',
  },
}

export default meta
