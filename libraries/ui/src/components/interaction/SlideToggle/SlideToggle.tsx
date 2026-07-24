import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, PropsWithChildren, ReactNode } from 'react'
import { motion } from 'framer-motion'
import clsx from 'clsx'

import Icon from '../../typography/Icon'

import './SlideToggle.css'

type SlideToggleProps = {
  title: ReactNode,
  defaultOpen?: boolean,
  className?: string,
  style?: CSSProperties,
  onToggle?: (open: boolean) => void,
}

/**
 * A collapsible section: clickable header with a spinning chevron, and
 * children that spring open/closed. Children stay mounted while collapsed so
 * form state inside survives toggling.
 */
const SlideToggle = ({
  title,
  defaultOpen = true,
  className,
  style,
  onToggle = () => {},
  children,
}: PropsWithChildren<SlideToggleProps>) => {
  const [open, setOpen] = useState(defaultOpen)
  const contentRef = useRef<HTMLDivElement>(null)

  const toggle = () => {
    setOpen(!open)
    onToggle(!open)
  }

  /**
   * Collapsed content is inert so its (invisible) inputs can't be tabbed into. Set as a raw
   * attribute because React 18 doesn't support the boolean `inert` prop yet.
   */
  useEffect(() => {
    if (open) {
      contentRef.current?.removeAttribute('inert')
    } else {
      contentRef.current?.setAttribute('inert', '')
    }
  }, [open])

  return (
    <div className={clsx('slide-toggle', className, { open })} style={style}>
      <button type="button" className="slide-toggle-header" aria-expanded={open} onClick={toggle}>
        <motion.span
          className="slide-toggle-arrow"
          initial={false}
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        >
          <Icon fa="fas fa-chevron-down" />
        </motion.span>
        <span className="slide-toggle-title">{title}</span>
      </button>
      <motion.div
        ref={contentRef}
        className="slide-toggle-content"
        initial={false}
        animate={{ height: open ? 'auto' : 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
      >
        {children}
      </motion.div>
    </div>
  )
}

export default SlideToggle
