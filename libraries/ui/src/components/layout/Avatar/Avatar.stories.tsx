import type { Meta, StoryObj } from '@storybook/react'

import Avatar from './Avatar'

const meta = {
  title: 'Layout/Avatar',
  component: Avatar,
  argTypes: {},
} satisfies Meta<typeof Avatar>
type Story = StoryObj<typeof meta>

export const Image: Story = {
  args: {
    type: 'image',
    image: 'elephant.jpg',
  },
}

export const Initials: Story = {
  args: {
    type: 'color',
    initials: 'ME',
  },
}

export const Color: Story = {
  args: {
    type: 'color',
    color: 'lightblue',
  },
}

export const ColorAndInitials: Story = {
  args: {
    type: 'color',
    initials: 'CR',
    color: 'lightblue',
  },
}

export const Icon: Story = {
  args: {
    fa: 'fas fa-swimmer',
  },
}

export const Guest: Story = {
  args: {
    type: 'guest',
  },
}

export default meta
