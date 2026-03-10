import type { PropsWithChildren } from 'react'
import clsx from 'clsx'

import './Textarea.css'

type TextareaProps = {
  name?: string,
  value?: string,
  placeholder?: string,
  className?: string,
  onFocus?: (e) => void,
  onBlur?: (e) => void,
  onChange?: (e) => void,
}

/**
 * Textarea.
 */
const Textarea = ({
  name,
  value,
  placeholder,
  className,
  onFocus = () => {},
  onBlur = () => {},
  onChange = () => {},
  ...props
}: PropsWithChildren<TextareaProps>) => {
  return (
    <div className={clsx('textarea', className)}>
      <textarea
        name={name}
        placeholder={placeholder}
        spellCheck="false"
        onFocus={(e) => onFocus(e.target.value)}
        onBlur={(e) => onBlur(e.target.value)}
        onChange={(e) => onChange(e.target.value)}
        value={value}
        {...props}
      />
    </div>
  )
}

export default Textarea
