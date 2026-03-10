import type { CSSProperties, PropsWithChildren } from 'react'
import clsx from 'clsx'

import './NumberInput.css'

type NumberInputProps = {
  name?: string,
  type?: string,
  value?: string | number,
  defaultValue?: number,
  placeholder?: string,
  min?: number,
  max?: number,
  size?: 'l' | 'm' | 's',
  className?: string,
  style?: CSSProperties,
  onFocus?: (value: number) => void,
  onBlur?: (value: number) => void,
  onEnter?: (value: number) => void,
  onChange?: (value: number) => void,
}

/**
 * Number input.
 */
const NumberInput = ({
  name,
  type,
  value,
  defaultValue,
  placeholder = '',
  min,
  max,
  size = 'l',
  className,
  style,
  onFocus = () => {},
  onBlur = () => {},
  onChange = () => {},
  onEnter = () => {},
  ...props
}: PropsWithChildren<NumberInputProps>) => {
  const transformValue = (v) => {
    if (type === 'number') {
      const asNumber = Number(v)
      return isNaN(asNumber)
        ? v
        : asNumber
    }
    return v
  }
  return (
    <div className={clsx('number-input', className, `size-${size}`)}>
      <input
        type="number"
        name={name}
        value={value}
        defaultValue={defaultValue}
        placeholder={placeholder}
        min={min}
        max={max}
        style={style}
        onFocus={(e) => onFocus(transformValue(e.target.value))}
        onBlur={(e) => onBlur(transformValue(e.target.value))}
        onChange={(e) => onChange(transformValue(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            onEnter(transformValue((e.target as HTMLInputElement).value))
          }
        }}
        {...props}
      />
    </div>
  )
}

export default NumberInput
