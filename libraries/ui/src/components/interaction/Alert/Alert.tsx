import Button from '../Button'
import Icon from '../../typography/Icon'

import './Alert.css'

type AlertType = 'success' | 'warning' | 'error' | 'info' | 'neutral'

type AlertProps = {
  type?: AlertType,
  message: string | React.ReactNode,
  buttons?: Array<{
    label: string,
    onClick: () => void,
  }>,
}

const ICONS: Record<AlertType, string> = {
  info: 'fas fa-info-circle',
  neutral: 'fas fa-info-circle',
  success: 'fas fa-check-circle',
  warning: 'fas fa-exclamation-triangle',
  error: 'fas fa-exclamation-circle',
}

/**
 * @param {array} buttons - Array of object with keys `label`, `onClick`
 */
const Alert = ({
  type = 'success',
  message,
  buttons = [],
}: AlertProps) => {
  return (
    <div className={`alert ${type}`}>
      <Icon className="alert-icon" fa={ICONS[type]} />
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
