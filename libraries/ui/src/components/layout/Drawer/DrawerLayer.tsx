import { useEffect, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'

import { drawerSelectors, drawerActions } from '../../../store/slices/drawer'

import './Drawer.css'

const DrawerLayer = () => {
  const dispatch = useDispatch()
  const ref = useRef(null)
  const isOpen = useSelector(drawerSelectors.isOpen)

  /**
   * Drawer may be cached in open state, but without contents (happens on
   * reload if drawer is open).
   */
  useEffect(() => {
    if (ref.current) {
      if (!ref.current?.querySelector('.drawer-content')) {
        dispatch(drawerActions.close())
      }
    }
  }, [ref.current])

  return (
    <div
      ref={ref}
      id="drawer-layer-portal"
      className={`drawer-layer ${isOpen ? 'open' : ''}`}
    />
  )
}

export default DrawerLayer
