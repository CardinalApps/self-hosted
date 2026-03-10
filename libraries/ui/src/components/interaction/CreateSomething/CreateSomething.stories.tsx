import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'

import CreateSomething from './CreateSomething'

const meta = {
  title: 'Interaction/CreateSomething',
  component: CreateSomething,
  argTypes: {},
} satisfies Meta<typeof CreateSomething>
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    onChange: (value) => console.log(value),
    onSubmit: (value) => console.log(value),
  },
}

export function Clear() {
  const [clear, setClear] = useState({ isSuccess: false })
  const simulateAsync = () => {
    setClear({ isSuccess: true })
    setTimeout(() => setClear({ isSuccess: false }))
  }
  return (
    <>
      <p>An async RTK query call will be simulated when the value is submitted to test the automatic clear feature.</p>
      <CreateSomething
        onSubmit={() => simulateAsync()}
        rtkResult={clear}
      />
    </>
  )
}

export default meta
