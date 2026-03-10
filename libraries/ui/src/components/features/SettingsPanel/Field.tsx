import type { CSSProperties, PropsWithChildren } from 'react'
import clsx from 'clsx'

import { SettingsObject } from '@cardinalapps/app-settings/src/types'

import Desc from './layout/Desc'

type FieldProps = {
  className?: string,
  style?: CSSProperties,
  field: SettingsObject,
}

/**
 * Custom settings pages for the Media Server.
 */
function Field({
  className,
  style,
  children,
  field,
}: PropsWithChildren<FieldProps>) {
  const { label, description, type, slug } = field

  if (type === 'toggle') {
    return children
  }

  return (
    <div className={clsx('field', className, `type-${type}`, slug)} style={style}>
      <div className="field-meta">
        {!!label && <p className="field-label">{label}</p>}
        {!!description && <Desc>{description}</Desc>}
      </div>
      <div className="field-input">
        {children}
      </div>
    </div>
  )
}

export default Field
