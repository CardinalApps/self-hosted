import { useEffect, useRef } from 'react'
import type { PropsWithChildren, ReactNode } from 'react'
import { useDispatch } from 'react-redux'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'

import Loading from '../Loading'

import { modalActions } from '../../../store/slices/modal'

import Card from '../Card'

import './Modal.css'

type ModalProps = {
  width?: number,
  loading?: boolean,
  clickOutsideToClose?: boolean,
  canClose?: boolean,
  onClose?: () => void,
  children?: ReactNode,
}

const Modal = ({
  width,
  loading = false,
  clickOutsideToClose = false,
  canClose = true,
  onClose,
  children,
}: PropsWithChildren<ModalProps>) => {
  const dispatch = useDispatch()
  const closeButtonRef = useRef(null)

  const handleClose = (triggerCb: boolean = true) => {
    if (canClose) {
      dispatch(modalActions.close())
      if (triggerCb) {
        onClose?.()
      }
    }
  }

  /**
   * Automatically enable the modal layer when this component is inserted in the
   * DOM.
   */
  useEffect(() => {
    dispatch(modalActions.open())

    // Automatically focus the close cutton
    if (closeButtonRef.current) {
      // Not sure why 0ms doesn't work
      setTimeout(() => {
        closeButtonRef.current?.focus()
      }, 100)
    }

    return () => handleClose(false)
  }, [])

  /**
   * Esc to close.
   */
  useEffect(() => {
    const onEsc = (e) => {
      if (e?.key === 'Escape') {
        e.stopImmediatePropagation()
        handleClose()
      }
    }
    document.addEventListener('keydown', onEsc)
    return () => document.removeEventListener('keydown', onEsc)
  }, [loading, canClose])

  return (
    // Render in the modal layer above all other app content.
    createPortal(
      (
        <>
          <div className="modal-underlay" onClick={() => clickOutsideToClose ? handleClose() : null} />
          <motion.div
            className="modal-center"
            initial={{
              top: 8,
            }}
            animate={{
              top: 0,
            }}
          >
            <button ref={closeButtonRef} className="modal-close" onClick={() => handleClose()}>
              <i className="fas fa-times" />
            </button>
            <div>
              <Card className="modal-content" style={{ ...(width && { maxWidth: width }) }}>
                {loading
                  ? <Loading className="modal-loading" />
                  : children
                }
              </Card>
            </div>
          </motion.div>
        </>
      ),
      document.querySelector('#modal-layer-portal'),
    )
  )
}

export default Modal
