import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import clsx from 'clsx'

import useThrottledCallback from '../../../hooks/useThrottledCallback'

import './RangeInput.css'

type RangeInputProps = {
  name?: string,
  value?: number,
  min?: number,
  max?: number,
  step?: number,
  unit?: string,
  size?: 'l' | 'm' | 's',
  className?: string,
  style?: CSSProperties,
  onChange?: (value: number) => void,
}

// Slider values are emitted at most this often while the thumb is being dragged
const EMIT_INTERVAL = 80

/**
 * Slider with a numeric readout, eg. "20px".
 */
const RangeInput = ({
  name,
  value = 0,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
  size = 'l',
  className,
  style,
  onChange = () => {},
}: RangeInputProps) => {
  const [draft, setDraft] = useState(value)
  const lastEmitted = useRef<number | null>(null)

  /*
   * Follow the prop, except when it's only the echo of our own last emit: mid-drag the draft is
   * ahead of whatever the consumer has stored, and accepting the echo would snap the thumb back.
   */
  useEffect(() => {
    if (value !== lastEmitted.current) {
      setDraft(value)
    }
  }, [value])

  const emit = useThrottledCallback((next: number) => {
    lastEmitted.current = next
    onChange(next)
  }, EMIT_INTERVAL)

  const handleChange = (next: number) => {
    setDraft(next)
    emit(next)
  }

  return (
    <div className={clsx('range-input', className, `size-${size}`)} style={style}>
      <input
        type="range"
        name={name}
        value={draft}
        min={min}
        max={max}
        step={step}
        onChange={(e) => handleChange(Number(e.target.value))}
        onPointerUp={() => emit.flush()}
        onKeyUp={() => emit.flush()}
      />
      <span className="readout">{draft}{unit}</span>
    </div>
  )
}

export default RangeInput
