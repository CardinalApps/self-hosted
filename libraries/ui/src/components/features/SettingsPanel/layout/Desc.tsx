import type { ReactNode } from 'react'
import clsx from 'clsx'

type DescProps = {
  showIcon?: boolean,
  children?: ReactNode,
}

const Desc = ({
  showIcon = false,
  children,
}: DescProps) => {
  return (
    <div className={clsx('settings-field-desc')}>
      {!!showIcon && <i className="fas fa-info-circle" />}
      <div className="settings-field-desc-text" dangerouslySetInnerHTML={{ __html: children }} />
    </div>
  )
}

export default Desc
