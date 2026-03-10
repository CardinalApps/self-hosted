import type { PropsWithChildren } from 'react'
import clsx from 'clsx'

import i18n from './i18n'

import './ToggleSwitch.css'

type ToggleSwitchProps = {
  label?: string,
  description?: string,
  layout?: 'box',
  value1?: boolean | string,
  value2?: boolean | string,
  title?: string,
  name?: string,
  value?: boolean,
  onChange?: (value) => void,
  labelAlign?: 'left' | 'right',
  showActiveLabel?: boolean,
  disabled?: boolean,
}

/**
 * Toggle switch.
 */
const ToggleSwitch = ({
  label,
  description,
  layout,
  value1 = false,
  value2 = true,
  title,
  name,
  value = false,
  onChange = () => {},
  labelAlign = 'right',
  showActiveLabel = false,
  disabled = false,
  children,
}: PropsWithChildren<ToggleSwitchProps>) => {
  const getActiveLabel = () => {
    if (value) {
      return i18n['toggle-switch.enabled']['en']
    } else {
      return i18n['toggle-switch.disabled']['en']
    }
  }

  if (layout === 'box') {
    showActiveLabel = true
    labelAlign = 'left'
  }

  return (
    <div className={clsx('toggle-switch-box', layout)}>
      {children}
      <div className={`toggle-switch-box-inner`}>
        <div className="toggle-switch-box-meta-col">
          {title && <p className="toggle-switch-box-title" dangerouslySetInnerHTML={{ __html: title }} />}
          {description && <div className="description" dangerouslySetInnerHTML={{ __html: description }} />}
        </div>
        {labelAlign === 'left' && showActiveLabel && <div className="toggle-switch-active-label">{getActiveLabel()}</div>}
        {labelAlign === 'left' && label && <div className="toggle-switch-label" dangerouslySetInnerHTML={{ __html: label }} />}
        <label className={clsx('toggle-switch', value === value2 ? 'enabled' : '', !!disabled && 'disabled')}>
          <input
            type="checkbox"
            name={name}
            //value={value}
            checked={!!value}
            onChange={(e) => {
              if (!disabled) {
                onChange(e.target.checked ? value2 : value1)
              }
            }}
          />
          <div className="focus"></div>
          <div className="grab"></div>
          {!!disabled && <i className="lock fas fa-lock" />}
        </label>
      </div>
      {labelAlign === 'right' && showActiveLabel && <div className="toggle-switch-active-label">{getActiveLabel()}</div>}
      {labelAlign === 'right' && label && <div className="toggle-switch-label" dangerouslySetInnerHTML={{ __html: label }} />}
    </div>
  )
}

export default ToggleSwitch
