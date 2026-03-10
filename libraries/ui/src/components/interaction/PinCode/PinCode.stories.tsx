import { useState } from 'react'
import type { Meta } from '@storybook/react'

import PinCode from './PinCode'

const meta = {
  title: 'Interaction/PinCode',
  component: PinCode,
  argTypes: {},
} satisfies Meta<typeof PinCode>

export const Default = () => {
  const [pin, setPin] = useState<string>()
  const [reset, setReset] = useState(false)

  return (
    <div>
      <PinCode
        resetDigits={reset}
        onCompleted={(pin) => {
          setPin(pin)
        }}
      />
      <div style={{ paddingTop: 30, textAlign: "center" }}>
        <p style={{ marginBottom: 20 }}>Pin: {pin || '?'}</p>
        <button
          type="button"
          onClick={() => {
            setReset(!reset)
            setPin('?')
          }}>
          Reset
        </button>
      </div>
    </div>
  )
}

export default meta
