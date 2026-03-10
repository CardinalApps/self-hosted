import type { Meta, StoryObj } from '@storybook/react'
import Tags from './Tags'
import { TagProps } from './Tag'

const meta = {
  title: 'Interaction/Tags',
  component: Tags,
  argTypes: {},
} satisfies Meta<typeof Tags>
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    tags: ['Tag A', 'Tag B', 'Tag C'],
  },
}

export const Icon: Story = {
  args: {
    tags: [
      {
        label: 'Frog',
        icon: 'fas fa-frog',
        onClick: () => alert('Frog'),
      } as TagProps,
      'Tag B',
      'Tag C',
    ],
  },
}

export default meta
