import type { Meta, StoryObj } from '@storybook/react'
import ms from 'ms'

import TimeCounter from './TimeCounter'

const meta = {
  title: 'Typography/TimeCounter',
  component: TimeCounter,
  argTypes: {},
} satisfies Meta<typeof TimeCounter>
type Story = StoryObj<typeof meta>

export const SecondsAgo: Story = {
  args: {
    startedAt: Date.now() - 2000,
  },
}

export const MinutesAgo: Story = {
  args: {
    startedAt: Date.now() - ms('3 minutes'),
  },
}

export const HoursAgo: Story = {
  args: {
    startedAt: Date.now() - ms('3 hours'),
  },
}

export const DaysAgo: Story = {
  args: {
    startedAt: Date.now() - ms('3 days'),
  },
}

export const CustomPhrase: Story = {
  args: {
    startedAt: Date.now() - ms('2.97 minutes'),
  phrase: 'The server has been running for {time} since Saturday',
  },
}

export default meta
