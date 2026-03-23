import { useState } from 'react'

import type { Meta, StoryObj } from '@storybook/react'

import AnimatedGradient from './AnimatedGradient'

const meta = {
  title: 'Layout/AnimatedGradient',
  component: AnimatedGradient,
  argTypes: {},
} satisfies Meta<typeof AnimatedGradient>
type Story = StoryObj<typeof meta>

const palettes = [
  ['#34b73f', '#2f1773', '#5f1585'],
  ['#48dbfb', '#1dd1a1', '#00d2d3'],
  ['#5f27cd', '#341f97', '#ee5a24'],
  ['#f9ca24', '#6ab04c', '#eb4d4b'],
]

const AnimatedExample = () => {
  const [index, setIndex] = useState(0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-start' }}>
      <div style={{ width: 400, height: 300 }}>
        <AnimatedGradient values={palettes[index]} />
      </div>
      <button onClick={() => setIndex((i) => (i + 1) % palettes.length)}>
        Next palette
      </button>
    </div>
  )
}

export const Blotchy: Story = {
  args: {
    values: ['#34b73f', '#2f1773', '#5f1585'],
  },
  decorators: [
    (Story) => (
      <div style={{ width: 400, height: 300 }}>
        <Story />
      </div>
    ),
  ],
}

export const AnimatedTransition: Story = {
  render: () => <AnimatedExample />,
  args: {
    values: palettes[0],
  },
}

export default meta
