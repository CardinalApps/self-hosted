import { useEffect, useState } from 'react'
import type { PropsWithChildren, ReactNode } from 'react'
import { motion } from 'framer-motion'

import './Toast.css'
import Icon from '../../typography/Icon'

type ToastProps = {
  type?: 'success' | 'warning' | 'danger',
  title?: string,
  body?: string,
  controls?: ReactNode,
  animationDirection?: 'left' | 'right',
  showClose?: boolean,
  onClose?: () => void,
  ttl?: number,
  className?: string,
}

/**
 * A Toast is a small, non-blocking message meant to let the user know that
 * something has happened. Toasts can persist until the user takes action, or
 * can be given a timer. Users can ignore Toasts, in which they'll be lost at
 * the end of the session.
 *
 * Apps can use this Toast component directly if they need to, but the best way
 * to use toasts is with the Toaster component.
 */
const Toast = ({
  type = 'success',
  title,
  body,
  controls,
  animationDirection = 'right',
  showClose = true,
  ttl,
  onClose,
  className,
}: PropsWithChildren<ToastProps>) => {
  const [fadeOut, setFadeOut] = useState(false)

  const handleOnClose = () => {
    if (typeof onClose === 'function') {
      onClose()
    }
  }

  useEffect(() => {
    if (ttl) {
      setTimeout(() => {
        setFadeOut(true)

        // keep this in sync with the fade out CSS transition
        setTimeout(() => {
          if (typeof onClose === 'function') {
            onClose()
          }
        }, 600)
      }, ttl)
    }
  }, [])

  return (
    <motion.div
      initial={{ x: animationDirection === 'left' ? 20 : -20 }}
      animate={{ x: 0 }}
      className={`toast ${body ? 'has-body' : ''} ${fadeOut ? 'fade-out' : ''} ${className ? className : ''}`}
      data-type={type}
    >
      <div className="toast-status-icon">
        {type === 'success' && <Icon fa="fas fa-check-circle" />}
        {type === 'warning' && <Icon fa="fas fa-exclamation-triangle" />}
        {type === 'danger' && <Icon fa="fas fa-minus-circle" />}
      </div>
      <div className="toast-content">
        {title && typeof title === 'string' && <p className="toast-title">{title}</p>}
        {body && typeof body === 'string' && <div className="toast-body" dangerouslySetInnerHTML={{ __html: body }} />}
        {controls && <div className="toast-controls">{controls}</div>}
      </div>
      {showClose && (
        <div className={`toast-close-col ${!!controls || !!body ? 'top-close' : ''}`}>
          <Icon className="toast-close" onClick={handleOnClose} fa="fas fa-times" />
        </div>
      )}
    </motion.div>
  )
}

export default Toast
