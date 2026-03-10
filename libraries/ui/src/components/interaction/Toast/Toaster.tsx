import type { CSSProperties, PropsWithChildren } from 'react'
import { useSelector, useDispatch } from 'react-redux'

import { toastActions, toastSelectors } from '../../../store/slices/toast'
import { settingsSelectors } from '../../../store/slices/settings'

import Toast from './Toast'
import Button from '../Button'

import i18n from './i18n'

import './Toast.css'

type ToasterProps = {
  style?: CSSProperties,
  className?: string,
}

/**
 * The Toaster shows the toasts added to the store queue, and handles
 * removing them from the queue after they've been shown.
 */
const Toaster = ({
  style,
  className,
}: PropsWithChildren<ToasterProps>) => {
  const dispatch = useDispatch()
  const queue = useSelector(toastSelectors.queue)
  const { lang } = useSelector(settingsSelectors.current)

  return (
    <div className={`toaster ${className ? className : ''}`} style={style}>
      <div className="toast-list">
        {!!queue.length && queue.map((toastObj) => {
          return (
            <div key={toastObj.toastId} className="single-toast">
              <Toast
                onClose={() => dispatch(toastActions.removeFromQueue(toastObj.toastId))}
                {...toastObj}
              />
            </div>
          )
        })}
      </div>
      {queue.length >= 4 && (
        <div className="toaster-controls">
          <Button onClick={() => dispatch(toastActions.flushQueue())}>{i18n['toaster.clear-all']?.[lang]}</Button>
        </div>
      )}
    </div>
  )
}

export default Toaster
