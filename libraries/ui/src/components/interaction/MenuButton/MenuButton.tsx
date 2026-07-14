import { useState, useEffect, useRef } from 'react'
import type { CSSProperties, PropsWithChildren, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

import './MenuButton.css'
import clsx from 'clsx'

import Icon from '../../typography/Icon'

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

  /*
    Hand this in to own the open state yourself. A MenuButton that toggles something
    outside of itself, rather than dropping a menu down, cannot keep its own state:
    clicking elsewhere on the page would close the button while the thing it opened
    stayed open.
  */
  open?: boolean,
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
  open,
  children,
}: PropsWithChildren<MenuButtonProps>) => {
  const ref = useRef(null)
  const [internalIsOpen, setInternalIsOpen] = useState(defaultOpen)
  const isControlled = open !== undefined
  const isOpen = isControlled ? open : internalIsOpen

  const close = () => {
    if (!isControlled) {
      setInternalIsOpen(false)
    }
  }

  const handleOnClick = () => {
    const nextIsOpen = !isOpen

    if (!isControlled) {
      setInternalIsOpen(nextIsOpen)
    }

    if (typeof onOpenChange === 'function') {
      onOpenChange(nextIsOpen)
    }
  }

  useEffect(() => {
    const onEsc = (e) => {
      if (e.key === 'Escape') {
        close()
      }
    }

    const onClickOutside = (e) => {
      const closestMenuButton = e.target.closest('.menu-button')
      if (ref.current !== closestMenuButton) {
        close()
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
            : <Icon fa="fas fa-ellipsis-v" style={overrideIconStyle} />
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
