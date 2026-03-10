import { useState, useEffect, useRef } from 'react'
import type { Meta } from '@storybook/react'

import Scrubber from './Scrubber'

const meta = {
  title: 'Interaction/Scrubber',
  component: Scrubber,
  argTypes: {},
} satisfies Meta<typeof Scrubber>

export function Default(props) {
  return (
    <Scrubber
      {...props}
      onChange={(v) => console.log('onChange', v)}
      onChangeEnd={(v) => console.log('onChangeEnd', v)}
      onIsScrubbing={(isScrubbing) => {
        console.log('onIsScrubbing', isScrubbing)
      }}
    />
  )
}

export function AutomaticProgress(props) {
  const isMoving = useRef(false)
  const [value, setValue] = useState(0)
  const max = 100

  // Mocks audio/video playback
  useEffect(() => {
    const updater = setInterval(() => {
      if (!isMoving.current) {
        setValue((v) => v + 0.1 < max ? v + 0.1 : max)
      }
    }, 100)

    return () => clearInterval(updater)
  }, [])

  return (
    <Scrubber
      {...props}
      value={value}
      max={max}
      onChangeStart={() => {
        console.log('onChangeStart')
        isMoving.current = true
      }}
      onChange={(v) => {
        console.log('onChange', v)
        setValue(v.value)
      }}
      onChangeEnd={(v) => {
        console.log('onChangeEnd', v)
        setValue(v.value)
        isMoving.current = false
      }}
      onIsScrubbing={(isScrubbing) => {
        console.log('onIsScrubbing', isScrubbing)
      }}
    />
  )
}

export default meta
