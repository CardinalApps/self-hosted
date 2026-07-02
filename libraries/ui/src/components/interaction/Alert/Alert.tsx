import Button from '../Button'
import Icon from '../../typography/Icon'

import './Alert.css'

type AlertProps = {
  type?: 'success' | 'warning' | 'error' | 'info',
  message: string | React.ReactNode,
  buttons?: Array<{
    label: string,
    onClick: () => void,
  }>,
}

/**
 * @param {array} buttons - Array of object with keys `label`, `onClick`
 */
const Alert = ({
  type = 'success',
  message,
  buttons = [],
}: AlertProps) => {
  const getIcon = () => {
    switch (type) {
      case 'info':
        return <Icon fa="fas fa-info-circle" />
      case 'success':
        return <Icon fa="fas fa-check-circle" />
      case 'warning':
        return <Icon fa="fas fa-exclamation-triangle" />
      case 'error':
        return <Icon fa="fas fa-exclamation-circle" />
    }
  }
  return (
    <div className={`alert ${type}`}>
      {getIcon()}
      {typeof message === 'string'
        ? <p>{message}</p>
        : message
      }
      <div className="alert-controls-col">
        {!!buttons.length && buttons.map((btn) => {
          return (
            <Button key={btn.label} type="button" outline onClick={btn.onClick}>
              {btn.label}
            </Button>
          )
        })}
      </div>
    </div>
  )
}

export default Alert
