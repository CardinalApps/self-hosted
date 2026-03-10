import type { Meta, StoryObj } from '@storybook/react'
import Queue from './Queue'
//import { QueueProps } from './Queue'

const meta = {
  title: 'Interaction/Queue',
  component: Queue,
  argTypes: {},
} satisfies Meta<typeof Queue>
type Story = StoryObj<typeof meta>

export const MusicQueue: Story = {
  args: {
    layout: 'list',
  },
}

export default meta
