import type { Meta, StoryObj } from '@storybook/react'

import AccessError from './AccessError'

const meta = {
  title: 'Layout/AccessError',
  component: AccessError,
  argTypes: {},
} satisfies Meta<typeof AccessError>
type Story = StoryObj<typeof meta>

export const PageNotFound: Story = {
  args: {
    overrides: { code: 404 },
  },
}

export const Forbidden: Story = {
  args: {
    overrides: {
      code: 403,
      name: 'Forbidden',
      message: '<p>You do not have access to this page. Ask a server admin to grant you these capabilities:</p><p><code>AdminApp.Login, Users.Read</code></p>',
    },
  },
}

export const ForbiddenComponent: Story = {
  args: {
    overrides: {
      code: 403,
      name: 'Forbidden',
      message: '<p>You do not have access to this component. Ask a server admin to grant you these capabilities:</p><p><code>Library.Manage</code></p>',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 500 }}>
        <Story />
      </div>
    ),
  ],
}

export default meta
