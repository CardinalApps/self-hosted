import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'

import RangeInput from './RangeInput'

const meta = {
  title: 'Forms/RangeInput',
  component: RangeInput,
  argTypes: {},
} satisfies Meta<typeof RangeInput>
type Story = StoryObj<typeof meta>

// Stateful host so the slider actually moves in the story
const StatefulRangeInput = (args: React.ComponentProps<typeof RangeInput>) => {
  const [value, setValue] = useState(args.value ?? 20)
  return <RangeInput {...args} value={value} onChange={setValue} />
}

export const Default: Story = {
  args: {
    min: 0,
    max: 60,
    unit: 'px',
    value: 20,
  },
  render: (args) => <StatefulRangeInput {...args} />,
}

export const Milliseconds: Story = {
  args: {
    min: 0,
    max: 1000,
    step: 5,
    unit: 'ms',
    value: 225,
  },
  render: (args) => <StatefulRangeInput {...args} />,
}

export default meta
