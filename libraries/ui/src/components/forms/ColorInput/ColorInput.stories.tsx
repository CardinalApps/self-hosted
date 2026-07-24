import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'

import ColorInput from './ColorInput'

const meta = {
  title: 'Forms/ColorInput',
  component: ColorInput,
  argTypes: {},
} satisfies Meta<typeof ColorInput>
type Story = StoryObj<typeof meta>

// Stateful host so picking a color actually updates the story
const StatefulColorInput = (args: React.ComponentProps<typeof ColorInput>) => {
  const [value, setValue] = useState(args.value ?? '#cc4c43')
  return <ColorInput {...args} value={value} onChange={setValue} />
}

export const Default: Story = {
  args: {
    value: '#cc4c43',
  },
  render: (args) => <StatefulColorInput {...args} />,
}

export const WithAlpha: Story = {
  args: {
    value: 'rgba(255, 255, 255, 0.2)',
    alpha: true,
  },
  render: (args) => <StatefulColorInput {...args} />,
}

export default meta
