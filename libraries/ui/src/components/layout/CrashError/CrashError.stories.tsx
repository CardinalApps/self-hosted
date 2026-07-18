import type { Meta, StoryObj } from '@storybook/react'

import CrashError from './CrashError'

const meta = {
  title: 'Layout/CrashError',
  component: CrashError,
  argTypes: {},
} satisfies Meta<typeof CrashError>
type Story = StoryObj<typeof meta>

export const Default: Story = {
  decorators: [
    (Story) => (
      <div>
        <Story />
      </div>
    ),
  ],
}

export default meta
