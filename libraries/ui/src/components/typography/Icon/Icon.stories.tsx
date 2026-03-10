import type { Meta, StoryObj } from '@storybook/react'

import Icon from './Icon'

const meta = {
  title: 'Typography/Icon',
  component: Icon,
  argTypes: {},
} satisfies Meta<typeof Icon>
type Story = StoryObj<typeof meta>

export const LinkIcon: Story = {
  args: {
    fa: 'fas fa-book',
    title: 'Icon title',
    href: 'javascript:;',
  },
}

export const ButtonIcon: Story = {
  args: {
    fa: 'fas fa-book',
    title: 'Icon title',
    onClick: (e) => console.log(e),
  },
}

export default meta
