import { useState, useEffect } from 'react'
import type { PropsWithChildren } from 'react'

import './PinCode.css'

const getInitialDigits = (numDigits) => {
  const initialArray = []
  for (let i = 1; i <= numDigits; i++) {
    initialArray.push(undefined)
  }
  return initialArray
}

type PinCodeProps = {
  numDigits?: number,
  resetDigits?: boolean,
  onChange?: (pin) => void,
  onCompleted?: (pin) => void,
}

/**
 * Allows the user to enter a pin code, typically for MFA.
 *
 * @param {array} setDigits - Give an array of digits. E.g., [2, 4, 6, 8].
 * @returns {number}
 */
const PinCode = ({
  numDigits = 4,
  resetDigits,
  onChange,
  onCompleted,
}: PropsWithChildren<PinCodeProps>) => {
  const [isCompleted, setIsCompleted] = useState(false)
  const [pin, setPin] = useState(getInitialDigits(numDigits))

  /**
   * Sets a single digit in the pin.
   */
  const setPinDigit = (digit, value) => {
    const newPin = [...pin]
    newPin[digit] = value
    setPin(newPin)
    if (typeof onChange === 'function') {
      onChange(newPin.join(''))
    }
  }

  /**
   * Resets the pin internally.
   */
  const reset = () => {
    setPin(getInitialDigits(numDigits))
    setIsCompleted(false)
  }

  /**
   * The parent can flip a boolean to reset the state.
   */
  useEffect(() => {
    reset()
  }, [resetDigits])

  /**
   * onCompleted
   */
  useEffect(() => {
    if (isCompleted && typeof onCompleted === 'function') {
      onCompleted(pin.join(''))
    }
  }, [isCompleted])

  return (
    <div className={`pin-code-input`}>
      {pin.map((value, digitIndex) => {
        return <input
          type="number"
          key={`digit-${digitIndex + 1}`}
          name={`digit-${digitIndex + 1}`}
          value={value !== undefined ? value : ''}
          max={9}
          min={0}
          disabled={!!isCompleted}
          onKeyUp={(e) => {
            if (e.key === 'Backspace') {
              const prevDigitEl = document.querySelector(`input[type="number"][name="digit-${digitIndex}"]`) as HTMLElement
              if (prevDigitEl) {
                setPinDigit(digitIndex - 1, undefined)
                prevDigitEl.focus()
              }
            }
          }}
          onFocus={(e) => {
            e.target.value = ''
          }}
          onChange={(e) => {
            setPinDigit(digitIndex, parseInt(e.target.value))
            const nextDigitEl = document.querySelector(`input[type="number"][name="digit-${digitIndex + 2}"]`) as HTMLElement
            if (nextDigitEl) {
              nextDigitEl.focus()
            } else {
              setIsCompleted(true)
            }
          }}
        />
      })}
    </div>
  )
}

export default PinCode
