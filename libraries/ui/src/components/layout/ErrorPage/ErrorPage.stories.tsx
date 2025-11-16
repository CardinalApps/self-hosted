import type { Meta, StoryObj } from '@storybook/react'

import ErrorPage from './ErrorPage'

const meta = {
  title: 'Layout/ErrorPage',
  component: ErrorPage,
  argTypes: {},
} satisfies Meta<typeof ErrorPage>
type Story = StoryObj<typeof meta>

export const PageNotFound: Story = {
  args: {
    overrides: { code: 404 },
  },
}

export default meta
