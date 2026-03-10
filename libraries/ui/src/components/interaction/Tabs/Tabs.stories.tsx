import type { Meta, StoryObj } from '@storybook/react'
import Tabs from './Tabs'

const meta = {
  title: 'Interaction/Tabs',
  component: Tabs,
  argTypes: {},
} satisfies Meta<typeof Tabs>
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    labels: ['Tab 1', 'Tab 2', 'Tab 3'],
  },
}

export const WithAnInitialTab: Story = {
  args: {
    labels: ['Tab 1', 'Tab 2 (should be the initial tab)', 'Tab 3'],
    initialTab: 1,
  },
}

export default meta
