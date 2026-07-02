import clsx from 'clsx'

import Icon from '../../../typography/Icon'

type DescProps = {
  showIcon?: boolean,
  children?: string,
}

const Desc = ({
  showIcon = false,
  children,
}: DescProps) => {
  return (
    <div className={clsx('settings-field-desc')}>
      {!!showIcon && <Icon fa="fas fa-info-circle" />}
      <div className="settings-field-desc-text" dangerouslySetInnerHTML={{ __html: children ?? '' }} />
    </div>
  )
}

export default Desc
