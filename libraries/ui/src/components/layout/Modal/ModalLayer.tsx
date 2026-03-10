import { useEffect, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'

import { modalSelectors, modalActions } from '../../../store/slices/modal'

import './Modal.css'

const ModalLayer = () => {
  const dispatch = useDispatch()
  const ref = useRef(null)
  const isOpen = useSelector(modalSelectors.isOpen)

  /**
   * Modal may be cached in open state, but without contents (happens on
   * reload if modal is open).
   */
  useEffect(() => {
    if (ref.current) {
      if (!ref.current?.querySelector('.modal-content')) {
        dispatch(modalActions.close())
      }
    }
  }, [ref.current])

  return (
    <div
      ref={ref}
      id="modal-layer-portal"
      className={`modal-layer ${isOpen ? 'open' : ''}`}
    />
  )
}

export default ModalLayer
