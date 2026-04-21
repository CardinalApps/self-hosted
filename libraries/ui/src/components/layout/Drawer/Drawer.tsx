import { useEffect, useState } from 'react'
import clsx from 'clsx'
import type { PropsWithChildren, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { useAppDispatch } from '../../../hooks/useAppDispatch'
import { useAppSelector } from '../../../hooks/useAppSelector'
import HasCapabilities from '../HasCapabilities'
import { MediaServerCapability } from '@cardinalapps/access-control/src'

import H3 from '../../typography/H3'
import Loading from '../Loading'

import { drawerActions } from '../../../store/slices/drawer'
import { modalSelectors } from '../../../store/slices/modal'

import Card from '../Card'

import './Drawer.css'

type DrawerProps = {
  width?: number | 'm' | 'l' | 'xl',
  title?: string | React.ReactNode,
  subtitle?: string,
  loading?: boolean,
  onClose?: () => void,
  className?: string,
  children?: ReactNode,
}

const Drawer = ({
  width = 'm',
  title,
  subtitle,
  loading = false,
  onClose,
  className,
  children,
}: PropsWithChildren<DrawerProps>) => {
  const dispatch = useAppDispatch()
  const modalIsOpen = useAppSelector(modalSelectors.isOpen)

  const handleClose = () => {
    if (!modalIsOpen) {
      dispatch(drawerActions.close())
      onClose?.()
    }
  }

  /**
   * Automatically enable the modal layer when this component is inserted in the
   * DOM.
   */
  useEffect(() => {
    dispatch(drawerActions.open())
    return () => handleClose()
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
  }, [modalIsOpen])

  return (
    createPortal(
      (
        <motion.div
          className={clsx('drawer-pane', className, typeof width === 'string' && `width-${width}`)}
          style={{ ...(typeof width === 'number' && { width: width }) }}
          initial={{
            transform: 'translateX(0%)',
          }}
          animate={{
            transform: 'translateX(-100%)',
            transition: { type: 'spring', duration: 0.5 },
          }}
        >
          <div className="drawer-pane-inner">
            <button className="drawer-close">
              <i className="fas fa-times" onClick={handleClose} />
            </button>
            <Card className="drawer-content" shadow={2}>
              {loading
                ? <Loading className="drawer-loading" />
                : <div className="drawer-card-inner">
                    {typeof title === 'string'
                      ? <H3 className="drawer-title">{title}</H3>
                      : title
                    }
                    {!!subtitle && <p className="drawer-subtitle">{subtitle}</p>}
                    <div className="drawer-body">
                      {children}
                    </div>
                  </div>
              }
            </Card>
          </div>
        </motion.div>
      ),
      document.querySelector('#drawer-layer-portal'),
    )
  )
}

type DrawerSectionPropsType = {
  className?: string,
  title?: string,
  capabilities?: MediaServerCapability[],
}

Drawer.Section = ({ className, title, capabilities, children }: PropsWithChildren<DrawerSectionPropsType>) => {
  return (
    <section className={clsx('drawer-section')}>
      {!!title && <p className="drawer-section-title">{title}</p>}
      <div className={clsx('drawer-section-content', className)}>
        <HasCapabilities capabilities={capabilities}>
          {children}
        </HasCapabilities>
      </div>
    </section>
  )
}

type DrawerTabsPropsType = {
  className?: string,
  labels?: React.ReactNode[],
}

Drawer.Tabs = ({ className, labels = [], children }: PropsWithChildren<DrawerTabsPropsType>) => {
  const [activeTab, setActiveTab] = useState(0)
  return (
    <div className={clsx('drawer-tabs', className)} data-active={activeTab}>
      <nav className="drawer-tabs-row">
        {labels.map((label, index) => {
          return (
            <button
              key={index}
              className={clsx('drawer-tab-button', className, activeTab === index ? 'active' : null)}
              onClick={() => setActiveTab(index)}
            >
              {label}
            </button>
          )
        })}
      </nav>
      {children}
    </div>
  )
}

type DrawerTabPropsType = {
  className?: string,
  index: number,
}

Drawer.Tab = ({ className, index, children }: PropsWithChildren<DrawerTabPropsType>) => {
  return (
    <section className={clsx('drawer-tab', className)} data-index={index}>
      {children}
    </section>
  )
}

export default Drawer
