import { useState, useEffect, useRef } from 'react'
import type { CSSProperties, PropsWithChildren, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

import './MenuButton.css'
import clsx from 'clsx'

type MenuButtonProps = {
  className?: string,
  width?: number,
  icon?: ReactNode,
  size?: 's' | 'm',
  overrideButtonStyle?: CSSProperties,
  overrideIconStyle?: CSSProperties,
  solid?: boolean,
  onOpenChange?: (isOpen: boolean) => void,
  align?: string,
  defaultOpen?: boolean,
  title?: string,
}

/**
 * MenuButton.
 *
 * @param {function} onOpenChange - Callback function, first arg will be a
 * boolean indicating whether the item is "open".
 */
const MenuButton = ({
  className,
  width,
  icon,
  size = 's',
  overrideButtonStyle,
  overrideIconStyle,
  solid = true,
  onOpenChange,
  align = 'left',
  defaultOpen = false,
  title,
  children,
}: PropsWithChildren<MenuButtonProps>) => {
  const ref = useRef(null)
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const handleOnClick = () => {
    setIsOpen(!isOpen)
    if (typeof onOpenChange === 'function') {
      onOpenChange(true)
    }
  }

  useEffect(() => {
    const onEsc = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    const onClickOutside = (e) => {
      const closestMenuButton = e.target.closest('.menu-button')
      if (ref.current !== closestMenuButton) {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', onEsc)
    document.addEventListener('click', onClickOutside)

    return () => {
      document.removeEventListener('keydown', onEsc)
      document.removeEventListener('click', onClickOutside)
    }
  }, [])

  return (
    <div ref={ref} className={`menu-button align-${align} ${className ? className : ''}`}>
      <button
        className={`size-${size} ${solid ? 'solid' : ''} ${isOpen ? 'open' : ''}`}
        type="button"
        onClick={handleOnClick}
        style={overrideButtonStyle}
        title={title}
      >
        {
          icon
            ? icon
            : <i className="fas fa-ellipsis-v" style={overrideIconStyle} />
        }
      </button>
      <AnimatePresence>
        {!!children && !!isOpen && (
          <motion.div
            className="menu-box"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0, transition: { type: "spring", mass: 0.1 } }}
            exit={{ opacity: 0, y: -4, transition: { type: "spring", mass: 0.1 } }}
          >
            <div
              className="menu-box-inner"
              style={width ? { width } : undefined}
            >
              {title && <p className="inner-title">{title}</p>}
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

MenuButton.Section = (props: PropsWithChildren<{ title?: string, className?: string, }>) => {
  return (
    <section className={clsx('menu-button-section', props?.className)}>
      {props?.title && <p className="menu-button-section-title">{props?.title}</p>}
      {props?.children}
    </section>
  )
}

export default MenuButton
