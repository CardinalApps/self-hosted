import type { CSSProperties, PropsWithChildren, ReactNode } from 'react'

import H3 from '../../typography/H3'

import './Form.css'

type FormProps = {
  title?: string,
  description?: string,
  controls?: ReactNode,
  controlsAlign?: 'flex-start' | 'center' | 'flex-end',
  error?: string,
  className?: string,
  style?: CSSProperties,
  onSubmit?: (e, formData) => void,
  children?: ReactNode,
}

/**
 * Set `data-is-json` on any form element for automatic JSON parsing in the
 * returned formData.
 */
const Form = ({
  title,
  description,
  controls,
  controlsAlign = 'flex-end',
  error,
  className,
  style,
  onSubmit,
  children,
}: PropsWithChildren<FormProps>) => {
  /**
   * Collects all form data. Inputs with a field name that starts with `json-`
   * will have their contents parsed as JSON.
   */
  const getFormData = (e) => {
    const formEl = e.target.matches('form')
      ? e.target
      : e.target.closest('form')

    const entries = {}
    Array.from(new FormData(formEl).entries()).forEach(([key, value]) => entries[key] = value)

    const jsonFields = Array.from(formEl.querySelectorAll('[data-is-json="true"]')).map((el: HTMLElement) => el.getAttribute('name'))

    for (const [name, value] of Object.entries(entries) ) {
      if (typeof name === 'string' && jsonFields.includes(name)) {
        entries[name] = JSON.parse(value as string)
      }
    }

    return entries
  }

  return (
    <form
      className={`form ${className} ${error ? 'error' : ''}`}
      style={style}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          onSubmit?.(e, getFormData(e))
        }
      }}
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit?.(e, getFormData(e))
      }}
    >
      {title && (
        <H3 className="form-title">
          {title}
        </H3>
      )}
      {description && (
        <div className="form-description">
          {description}
        </div>
      )}
      {error && (
        <p className="form-field-error">
          {error}
        </p>
      )}
      {children}
      {controls && (
        <div className="form-controls" data- style={{ justifyContent: controlsAlign }}>
          {controls}
        </div>
      )}
    </form>
  )
}

export default Form
