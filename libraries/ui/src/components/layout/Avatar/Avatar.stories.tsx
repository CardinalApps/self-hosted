import type { Meta, StoryObj } from '@storybook/react'

import Avatar from './Avatar'

const meta = {
  title: 'Layout/Avatar',
  component: Avatar,
  argTypes: {
    type: {
      control: { type: 'select' },
      options: ['image', 'color', 'guest'],
      table: { category: 'Content' },
    },
    image: { control: 'text', table: { category: 'Content' } },
    initials: { control: 'text', table: { category: 'Content' } },
    fa: { control: 'text', table: { category: 'Content' } },
    color: { control: 'color', table: { category: 'Content' } },
    size: {
      control: { type: 'select' },
      options: ['xs', 's', 'm', 'l', 'xl'],
      table: { category: 'Appearance' },
    },
  },
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
    color: '#cc4c43',
  },
}

export const Icon: Story = {
  args: {
    fa: 'fas fa-music',
  },
}

export const Guest: Story = {
  args: {
    type: 'guest',
  },
}

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
      {(['xs', 's', 'm', 'l', 'xl'] as const).map((size) => (
        <div key={size} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <Avatar type="color" initials="CR" color="#cc4c43" size={size} />
          <span style={{ fontSize: 11, opacity: 0.6 }}>{size}</span>
        </div>
      ))}
    </div>
  ),
  parameters: {
    controls: { disable: true },
  },
}

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <Avatar type="image" image="elephant.jpg" />
      <Avatar type="color" initials="CR" color="#cc4c43" />
      <Avatar type="color" initials="JD" color="steelblue" />
      <Avatar fa="fas fa-music" />
      <Avatar type="guest" />
    </div>
  ),
  parameters: {
    controls: { disable: true },
  },
}

export default meta
