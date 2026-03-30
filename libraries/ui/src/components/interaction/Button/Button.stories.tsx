import { useState } from 'react'
import { fn } from '@storybook/test'
import type { Meta, StoryObj } from '@storybook/react'

import Button from './Button'

const meta = {
  title: 'Interaction/Button',
  component: Button,
  argTypes: {
    children: { control: 'text', table: { category: 'Content' } },
    icon: { control: 'text', table: { category: 'Content' } },
    href: { control: 'text', table: { category: 'Navigation' } },
    target: {
      control: { type: 'select' },
      options: ['_self', '_blank'],
      table: { category: 'Navigation' },
    },
    solid: { control: 'boolean', table: { category: 'Appearance' } },
    outline: { control: 'boolean', table: { category: 'Appearance' } },
    textual: { control: 'boolean', table: { category: 'Appearance' } },
    tag: { control: 'boolean', table: { category: 'Appearance' } },
    action: { control: 'boolean', table: { category: 'Appearance' } },
    arrowText: { control: 'boolean', table: { category: 'Appearance' } },
    circleIcon: { control: 'boolean', table: { category: 'Appearance' } },
    color: {
      control: { type: 'select' },
      options: [undefined, 'danger'],
      table: { category: 'Appearance' },
    },
    disabled: { control: 'boolean', table: { category: 'State' } },
    animation: {
      control: { type: 'select' },
      options: [undefined, 'loading', 'checkmark'],
      table: { category: 'State' },
    },
    type: {
      control: { type: 'select' },
      options: ['button', 'submit', 'reset'],
      table: { category: 'HTML' },
    },
    onClick: { table: { category: 'Events' } },
  },
  args: {
    onClick: fn(),
  },
} satisfies Meta<typeof Button>
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: 'Default Button',
  },
}

export const Solid: Story = {
  args: {
    solid: true,
    children: 'Solid Button',
  },
}

export const Outline: Story = {
  args: {
    outline: true,
    children: 'Outline Button',
  },
}

export const Textual: Story = {
  args: {
    textual: true,
    children: 'Textual Button',
  },
}

export const Danger: Story = {
  args: {
    color: 'danger',
    children: 'Delete Resource',
  },
}

export const Disabled: Story = {
  args: {
    children: 'Disabled Button',
    disabled: true,
  },
}

export const WithIcon: Story = {
  args: {
    children: 'Add to Queue',
    icon: 'fas fa-plus',
  },
}

export const Link: Story = {
  args: {
    href: 'https://cardinalapps.io',
    target: '_blank',
    children: 'Cardinal Apps Website',
  },
}

export const Tag: Story = {
  args: {
    tag: true,
    children: 'Rock',
  },
}

export const ArrowText: Story = {
  args: {
    arrowText: true,
    children: 'Learn more',
  },
}

export const Action: Story = {
  args: {
    action: true,
    icon: 'fas fa-shuffle',
    children: 'Shuffle Queue',
  },
}

export const Loading: Story = {
  render: () => {
    const [clicked, setClicked] = useState(false)
    return (
      <Button
        animation={clicked ? 'loading' : undefined}
        onClick={() => setClicked(true)}
      >
        {clicked ? 'Loading...' : 'Click to Load'}
      </Button>
    )
  },
}

export const Checkmark: Story = {
  render: () => {
    const [clicked, setClicked] = useState(false)
    return (
      <Button
        animation={clicked ? 'checkmark' : undefined}
        onClick={() => setClicked(true)}
      >
        {clicked ? 'Saved' : 'Save Changes'}
      </Button>
    )
  },
}

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
      <Button>Default</Button>
      <Button solid>Solid</Button>
      <Button outline>Outline</Button>
      <Button textual>Textual</Button>
      <Button tag>Tag</Button>
      <Button arrowText>Arrow Text</Button>
      <Button color="danger">Danger</Button>
      <Button disabled>Disabled</Button>
      <Button icon="fas fa-music">With Icon</Button>
      <Button action icon="fas fa-shuffle">Action</Button>
    </div>
  ),
  parameters: {
    controls: { disable: true },
  },
}

export default meta
