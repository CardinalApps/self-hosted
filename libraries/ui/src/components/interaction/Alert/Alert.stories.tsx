import { fn } from '@storybook/test'
import type { Meta, StoryObj } from '@storybook/react'

import Alert from './Alert'

const meta = {
  title: 'Interaction/Alert',
  component: Alert,
  argTypes: {
    type: {
      control: { type: 'select' },
      options: ['success', 'warning', 'error'],
      table: { category: 'Appearance' },
    },
    message: { control: 'text', table: { category: 'Content' } },
  },
} satisfies Meta<typeof Alert>
type Story = StoryObj<typeof meta>

export const Success: Story = {
  args: {
    type: 'success',
    message: 'Your changes have been saved successfully.',
  },
}

export const Warning: Story = {
  args: {
    type: 'warning',
    message: 'Your session will expire in 5 minutes. Save your work to avoid losing changes.',
  },
}

export const Error: Story = {
  args: {
    type: 'error',
    message: 'Failed to connect to the media server. Check that the server is running and try again.',
  },
}

export const SuccessWithButton: Story = {
  args: {
    type: 'success',
    message: 'Library scan complete. 147 new tracks were added to your collection.',
    buttons: [{ label: 'View new tracks', onClick: fn() }],
  },
}

export const WarningWithButton: Story = {
  args: {
    type: 'warning',
    message: 'Your storage is nearly full. Remove unused media or expand your storage.',
    buttons: [
      { label: 'Manage storage', onClick: fn() },
      { label: 'Dismiss', onClick: fn() },
    ],
  },
}

export const ErrorWithButton: Story = {
  args: {
    type: 'error',
    message: 'Authentication failed. Your session may have expired.',
    buttons: [{ label: 'Sign in again', onClick: fn() }],
  },
}

export const AllTypes: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 600 }}>
      <Alert type="success" message="Library scan complete. 147 new tracks added." />
      <Alert type="warning" message="Your storage is nearly full." />
      <Alert type="error" message="Failed to connect to the media server." />
    </div>
  ),
  parameters: {
    controls: { disable: true },
  },
}

export default meta
