
import type { Meta, StoryObj } from '@storybook/react'

import Alert from './Alert'

const meta = {
  title: 'Interaction/Alert',
  component: Alert,
  argTypes: {},
} satisfies Meta<typeof Alert>
type Story = StoryObj<typeof meta>

export const Success: Story = {
  args: {
    type: 'success',
    message: 'Something good has happened. This is the message for that thing.',
  },
}

export const Warning: Story = {
  args: {
    type: 'warning',
    message: 'Something not so great has happened. This is the message for that thing.',
  },
}

export const Error: Story = {
  args: {
    type: 'error',
    message: 'Something has created an error. This is the message for that thing.',
  },
}

export const SuccessWithButton: Story = {
  args: {
    type: 'success',
    message: "You can also add a button to an alert. It's just a regular button, but you can be sure it'll look good at all sizes.",
    buttons: [{ label: "Clicky", onClick: () => console.log('Click') }],
  },
}

export const WarningWithButton: Story = {
  args: {
    type: 'warning',
    message: "You can also add a button to an alert. It's just a regular button, but you can be sure it'll look good at all sizes.",
    buttons: [{ label: "Click 1", onClick: () => console.log('Click') }, { label: "Click 2", onClick: () => console.log('Click') }],
  },
}

export const ErrorWithButton: Story = {
  args: {
    type: 'error',
    message: "You can also add a button to an alert. It's just a regular button, but you can be sure it'll look good at all sizes.",
    buttons: [{ label: "Clicky", onClick: () => console.log('Click') }],
  },
}

export default meta
