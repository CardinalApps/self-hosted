import type { Meta, StoryObj } from '@storybook/react'

import Kbd from './Kbd'

const meta = {
  title: 'Typography/Kbd',
  component: Kbd,
  argTypes: {
    keys: { control: 'text', table: { category: 'Content' } },
    size: { control: 'inline-radio', options: ['m', 's'] },
  },
} satisfies Meta<typeof Kbd>
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    keys: 'mod+comma',
  },
}

export const ManyModifiers: Story = {
  args: {
    keys: 'mod+alt+shift+p',
  },
}

export const Small: Story = {
  args: {
    keys: 'mod+arrowright',
    size: 's',
  },
}

export default meta
