import type { PropsWithChildren } from 'react'
import clsx from 'clsx'

import './FormField.css'

type FormFieldProps = {
  label?: string,
  labelFor?: string,
  labelAsSpan?: boolean,
  subText?: string,
  error?: string,
  className?: string,
  style?: object,
}

const FormField = ({
  label,
  labelFor,
  labelAsSpan,
  subText,
  error,
  className,
  style,
  children,
}: PropsWithChildren<FormFieldProps>) => {
  return (
    <div className={clsx(`form-field`, className, `${error ? 'error' : ''}`)} style={style}>
      {label && (
        labelAsSpan
          ? <span className="form-field-label">
              {label}
            </span>
          : <label className="form-field-label" htmlFor={labelFor}>
              {label}
            </label>
      )}
      {error && (
        <p className="form-field-error">
          {error}
        </p>
      )}
      {children}
      {subText && (
        <p className="form-field-subtext">
          {subText}
        </p>
      )}
    </div>
  )
}

export default FormField
