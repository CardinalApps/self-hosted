import type { CSSProperties } from 'react'
import clsx from 'clsx'

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
  return (
    <div className={clsx('range-input', className, `size-${size}`)} style={style}>
      <input
        type="range"
        name={name}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="readout">{value}{unit}</span>
    </div>
  )
}

export default RangeInput
