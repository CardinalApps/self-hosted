import { useEffect } from 'react'

import './TextInput.css'
import clsx from 'clsx'

type TextInputProps = {
  name?: string,
  id?: string,
  type?: string,
  value?: string | number,
  className?: string,
  placeholder?: string,
  minLength?: number,
  maxLength?: number,
  disabled?: boolean,
  defaultValue?: string,
  size?: 'm' | 'l',
  onFocus?: (value) => void,
  onBlur?: (value) => void,
  onEnter?: (value) => void,
  onChange?: (value) => void,
}

/**
 * Text input.
 */
const TextInput = ({
  name,
  id,
  type = 'text',
  value = undefined,
  className,
  placeholder = '',
  minLength,
  maxLength,
  disabled,
  defaultValue,
  size = 'm',
  onFocus = () => {},
  onBlur = () => {},
  onChange = () => {},
  onEnter = () => {},
  ...props
}: TextInputProps) => {
  useEffect(() => {
    if (type === 'number') {
      console.warn('Use NumberInput instead of TextInput with type "number"')
    }
  }, [])
  return (
    <div className={clsx('text-input', className, `size-${size}`)}>
      <input
        type={type}
        name={name}
        id={id}
        value={value}
        disabled={disabled}
        defaultValue={defaultValue}
        placeholder={placeholder}
        minLength={minLength}
        maxLength={maxLength}
        onFocus={(e) => onFocus(e.target.value)}
        onBlur={(e) => onBlur(e.target.value)}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            onEnter((e.target as HTMLInputElement).value)
          }
        }}
        {...props}
      />
    </div>
  )
}

export default TextInput
