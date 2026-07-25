import { fn } from '@storybook/test'
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
    tags: ['Rock', 'Electronic', 'Ambient', 'Jazz'],
  },
}

export const WithIcons: Story = {
  args: {
    tags: [
      { label: 'Music', icon: 'fas fa-music' } as TagProps,
      { label: 'Photos', icon: 'fas fa-camera' } as TagProps,
      { label: 'Cinema', icon: 'fas fa-film' } as TagProps,
    ],
  },
}

export const Clickable: Story = {
  args: {
    tags: [
      { label: 'Rock', onClick: fn() } as TagProps,
      { label: 'Electronic', onClick: fn() } as TagProps,
      { label: 'Ambient', onClick: fn() } as TagProps,
      { label: 'Jazz', onClick: fn() } as TagProps,
    ],
  },
}

export const ClickableWithIcons: Story = {
  args: {
    tags: [
      { label: 'Favourites', icon: 'fas fa-star', onClick: fn() } as TagProps,
      { label: 'Recently Added', icon: 'fas fa-clock', onClick: fn() } as TagProps,
      { label: 'Downloads', icon: 'fas fa-download', onClick: fn() } as TagProps,
    ],
  },
}

export const ManyTags: Story = {
  args: {
    tags: [
      'Rock',
      'Pop',
      'Electronic',
      'Ambient',
      'Jazz',
      'Classical',
      'Hip-Hop',
      'R&B',
      'Country',
      'Folk',
      'Metal',
      'Indie',
    ],
  },
}

/**
 * For dense places where a regular tag would dominate, like a tooltip or a
 * metadata line under a title.
 */
export const Small: Story = {
  args: {
    size: 'small',
    tags: [
      '31.2 MB',
      { label: '05:48', icon: 'fas fa-clock' } as TagProps,
      'FLAC 16-bit/44.1 kHz',
    ],
  },
}

export default meta
