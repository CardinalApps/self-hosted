import { useState, useEffect, useRef } from 'react'
import type { Meta, StoryObj } from '@storybook/react'

import Scrubber from './Scrubber'

const meta = {
  title: 'Interaction/Scrubber',
  component: Scrubber,
  argTypes: {
    value: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
      table: { category: 'Progress' },
    },
    max: {
      control: { type: 'range', min: 1, max: 1000, step: 1 },
      table: { category: 'Progress' },
    },
  },
} satisfies Meta<typeof Scrubber>
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    value: 0,
    max: 100,
  },
  render: (args) => (
    <Scrubber
      {...args}
      onChange={(v) => console.log('onChange', v)}
      onChangeEnd={(v) => console.log('onChangeEnd', v)}
      onIsScrubbing={(v) => console.log('onIsScrubbing', v)}
    />
  ),
}

export const AutomaticProgress = () => {
  const isMoving = useRef(false)
  const [value, setValue] = useState(0)
  const max = 100

  useEffect(() => {
    const updater = setInterval(() => {
      if (!isMoving.current) {
        setValue((v) => v + 0.1 < max ? v + 0.1 : max)
      }
    }, 100)
    return () => clearInterval(updater)
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Scrubber
        value={value}
        max={max}
        onChangeStart={() => { isMoving.current = true }}
        onChange={(v) => { setValue(v.value) }}
        onChangeEnd={(v) => { setValue(v.value); isMoving.current = false }}
        onIsScrubbing={() => {}}
      />
      <div style={{ fontSize: 12, opacity: 0.6 }}>
        {Math.round(value)} / {max} — Drag the handle to scrub
      </div>
    </div>
  )
}

export default meta
