import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'

import Button from './Button'

const meta = {
  title: 'Interaction/Button',
  component: Button,
  argTypes: {},
} satisfies Meta<typeof Button>
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: 'Default Button',
  },
}

export const Link: Story = {
  args: {
    href: 'https://en.wikipedia.org',
    target: '_blank',
    children: 'Opens Wikipedia',
  },
}

export const Solid: Story = {
  args: {
    solid: true,
    children: 'Solid Button',
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
    children: 'Stranger danger',
    color: 'danger',
  },
}

export const Icon: Story = {
  args: {
    children: 'Button with an icon',
    icon: 'fas fa-star',
  },
}

export const Tag: Story = {
  args: {
    tag: true,
    children: 'Tag button',
  },
}
export const ArrowText: Story = {
  args: {
    arrowText: true,
    children: 'Text with that is a button',
  },
}

export const Loading = () => {
  const [clicked, setClicked] = useState(false)
  const [text, setText] = useState('Click Me')
  return (
    <Button
      animation={clicked ? 'loading' : undefined}
      onClick={() => {
        setClicked(true)
        setText('Loading...')
      }}
    >
      {text}
    </Button>
  )
}

export const Checkmark = () => {
  const [clicked, setClicked] = useState(false)
  const [text, setText] = useState('Click Me')
  return (
    <Button
      animation={clicked ? 'checkmark' : undefined}
      onClick={() => {
        setClicked(true)
        setText('Success')
      }}
    >
      {text}
    </Button>
  )
}

export const Action: Story = {
  args: {
    action: true,
    icon: 'fas fa-star',
    children: 'Shuffle Music',
  },
}

export default meta
