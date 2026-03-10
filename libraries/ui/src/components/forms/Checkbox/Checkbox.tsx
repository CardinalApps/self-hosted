import type { PropsWithChildren } from 'react'
import clsx from 'clsx'

import './Checkbox.css'

type CheckboxProps = {
  name?: string,
  checked?: boolean,
  onChange?: (checked: boolean) => void,
}

/**
 * Allows the user to input search queries.
 */
const Checkbox = ({
  name,
  checked,
  onChange = () => {},
}: PropsWithChildren<CheckboxProps>) => {
  return (
    <div className={clsx('fauxbox', checked && 'checked')}>
      <label>
        <input name={name} type="checkbox" checked={checked} tabIndex={0} onChange={(e) => onChange(e.target.checked)} />
        <div className="box">
          <i className="fas fa-check" />
        </div>
      </label>
    </div>
  )
}

export default Checkbox
